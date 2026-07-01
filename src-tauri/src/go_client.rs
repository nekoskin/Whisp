use std::path::PathBuf;
use std::process::{Child, Command, Stdio};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
#[cfg(windows)]
const BELOW_NORMAL_PRIORITY_CLASS: u32 = 0x00004000;

const SERVICE_NAME: &str = "WhisperaGW";
const SERVICE_DISPLAY: &str = "Whispera Gateway";

pub struct GoClientManager {
    binary_path: PathBuf,
    process: Option<Child>,
    use_service: bool,
}

pub struct GoClientConfig<'a> {
    pub conn_key: &'a str,
    pub server_addr: &'a str,
    pub socks_addr: &'a str,
    pub kill_switch: bool,
    pub transport: &'a str,
    pub vpn_dns: &'a str,
    pub mitm_enabled: bool,
    pub spoof_ips: &'a str,
    pub hwid: bool,
}

impl GoClientManager {
    pub fn new(binary_path: PathBuf) -> Self {
        Self {
            binary_path,
            process: None,
            use_service: false,
        }
    }

    pub fn install_service(&self, cfg: &GoClientConfig) -> Result<(), String> {
        let bin = self.binary_path.to_string_lossy().to_string();

        let key_part = if !cfg.conn_key.is_empty() {
            format!("-key \"{}\"", cfg.conn_key)
        } else {
            format!("-server \"{}\"", cfg.server_addr)
        };
        let mut args = format!("{} -socks \"{}\" -no-tun", key_part, cfg.socks_addr);
        if cfg.kill_switch {
            args.push_str(" -kill-switch");
        }
        if !cfg.transport.is_empty() {
            args.push_str(&format!(" -transport {}", cfg.transport));
        }
        if !cfg.hwid {
            args.push_str(" -hwid=false");
        }

        let bin_path = format!("\"{}\" {}", bin.replace('"', "\\\""), args);

        let _ = Command::new("sc")
            .args(["delete", SERVICE_NAME])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output();

        let status = Command::new("sc")
            .args([
                "create",
                SERVICE_NAME,
                "binPath=",
                &bin_path,
                "type=",
                "own",
                "start=",
                "demand",
                "DisplayName=",
                SERVICE_DISPLAY,
                "error=",
                "ignore",
            ])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("sc create failed: {}", e))?;

        if !status.status.success() {
            let err = String::from_utf8_lossy(&status.stderr).to_string();
            return Err(format!("Service install failed: {}", err));
        }

        let _ = Command::new("sc")
            .args([
                "description",
                SERVICE_NAME,
                "Whispera VPN gateway tunnel process",
            ])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output();

        Ok(())
    }

    pub fn uninstall_service(&mut self) -> Result<(), String> {
        let _ = self.stop_service();
        Command::new("sc")
            .args(["delete", SERVICE_NAME])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn start_service(&mut self) -> Result<(), String> {
        let out = Command::new("sc")
            .args(["start", SERVICE_NAME])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;

        if out.status.success()
            || String::from_utf8_lossy(&out.stdout).contains("RUNNING")
            || String::from_utf8_lossy(&out.stderr).contains("1056")
        {
            self.use_service = true;
            return Ok(());
        }

        Err(format!(
            "sc start failed: {}",
            String::from_utf8_lossy(&out.stderr)
        ))
    }

    fn stop_service(&mut self) -> Result<(), String> {
        Command::new("sc")
            .args(["stop", SERVICE_NAME])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output()
            .ok();
        let deadline = std::time::Instant::now() + std::time::Duration::from_millis(2000);
        while std::time::Instant::now() < deadline {
            if !service_running(SERVICE_NAME) {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        Command::new("taskkill")
            .args(["/F", "/IM", "whispera-go-client.exe"])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output()
            .ok();
        self.use_service = false;
        Ok(())
    }

    pub fn start(&mut self, cfg: &GoClientConfig) -> Result<(), String> {
        eprintln!(
            "[go_client] start() called, binary={}",
            self.binary_path.display()
        );

        if self.is_running() {
            eprintln!("[go_client] already running — keeping existing tunnel alive");
            return Ok(());
        }

        self.stop()?;
        std::thread::sleep(std::time::Duration::from_millis(100));

        if service_exists(SERVICE_NAME) {
            eprintln!("[go_client] service exists, trying service mode");
            if self.install_service(cfg).is_ok() && self.start_service().is_ok() {
                eprintln!("[go_client] started as service OK");
                return Ok(());
            }
            eprintln!("[go_client] service mode failed, falling back to direct");
        }

        self.start_direct(cfg)
    }

    fn start_direct(&mut self, cfg: &GoClientConfig) -> Result<(), String> {
        eprintln!(
            "[go_client] start_direct: binary={}, exists={}",
            self.binary_path.display(),
            self.binary_path.exists()
        );
        let mut cmd = Command::new(&self.binary_path);

        if !cfg.conn_key.is_empty() {
            cmd.arg("-key").arg(cfg.conn_key);
        } else if !cfg.server_addr.is_empty() {
            cmd.arg("-server").arg(cfg.server_addr);
        } else {
            return Err("No connection key or server address provided".to_string());
        }

        cmd.arg("-socks").arg(cfg.socks_addr);
        cmd.arg("-no-tun");

        if cfg.kill_switch {
            cmd.arg("-kill-switch");
        }

        if !cfg.transport.is_empty() {
            cmd.arg("-transport").arg(cfg.transport);
        }

        if !cfg.vpn_dns.is_empty() {
            cmd.arg("-dns").arg(cfg.vpn_dns);
        }

        if cfg.mitm_enabled {
            cmd.arg("-mitm");
        }

        if !cfg.hwid {
            cmd.arg("-hwid=false");
        }

        if !cfg.spoof_ips.is_empty() {
            cmd.arg("-spoof-ips").arg(cfg.spoof_ips);
        }

        let log_path = std::env::temp_dir().join("whispera-go-client.log");
        let log_file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .map(Stdio::from)
            .unwrap_or(Stdio::null());
        let log_file2 = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .map(Stdio::from)
            .unwrap_or(Stdio::null());

        cmd.stdout(log_file).stderr(log_file2);

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW | BELOW_NORMAL_PRIORITY_CLASS);

        let child = cmd
            .spawn()
            .map_err(|e| format!("Failed to start go-client: {}", e))?;

        self.process = Some(child);
        self.use_service = false;
        Ok(())
    }

    pub fn stop(&mut self) -> Result<(), String> {
        if self.use_service {
            return self.stop_service();
        }
        if let Some(ref mut child) = self.process {
            child.kill().ok();
            child.wait().ok();
        }
        self.process = None;
        self.kill_all_by_name();
        Ok(())
    }

    pub fn kill_all_by_name(&self) {
        #[cfg(windows)]
        {
            Command::new("taskkill")
                .args(["/F", "/IM", "whispera-go-client.exe"])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .ok();
        }
    }

    pub fn is_running(&mut self) -> bool {
        if self.use_service {
            return service_running(SERVICE_NAME);
        }
        match &mut self.process {
            Some(child) => match child.try_wait() {
                Ok(Some(_)) => {
                    self.process = None;
                    false
                }
                Ok(None) => true,
                Err(_) => false,
            },
            None => false,
        }
    }
}

impl Drop for GoClientManager {
    fn drop(&mut self) {
        self.stop().ok();
        self.kill_all_by_name();
    }
}

fn service_exists(name: &str) -> bool {
    Command::new("sc")
        .args(["query", name])
        .creation_flags_win(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn service_running(name: &str) -> bool {
    Command::new("sc")
        .args(["query", name])
        .creation_flags_win(CREATE_NO_WINDOW)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains("RUNNING"))
        .unwrap_or(false)
}

trait CommandExtWin {
    fn creation_flags_win(&mut self, flags: u32) -> &mut Self;
}

impl CommandExtWin for Command {
    fn creation_flags_win(&mut self, _flags: u32) -> &mut Self {
        #[cfg(windows)]
        self.creation_flags(_flags);
        self
    }
}

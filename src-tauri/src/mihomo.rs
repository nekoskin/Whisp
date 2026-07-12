use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
#[cfg(windows)]
const BELOW_NORMAL_PRIORITY_CLASS: u32 = 0x00004000;

const SERVICE_NAME: &str = "WhisperaNH";
const SERVICE_DISPLAY: &str = "Whispera Network Helper";

pub struct MihomoManager {
    binary_path: PathBuf,
    process: Option<Child>,
    elevated: bool,
    use_service: bool,
}

impl MihomoManager {
    pub fn new(binary_path: PathBuf) -> Self {
        Self {
            binary_path,
            process: None,
            elevated: false,
            use_service: false,
        }
    }

    pub fn install_service(&self, config_path: &Path) -> Result<(), String> {
        let bin = self.binary_path.to_string_lossy().to_string();
        let cfg = config_path.to_string_lossy().to_string();
        let home_dir = config_path
            .parent()
            .unwrap_or(config_path)
            .to_string_lossy()
            .to_string();

        let bin_path = format!(
            "\"{}\" -d \"{}\" -f \"{}\"",
            bin.replace('"', "\\\""),
            home_dir.replace('"', "\\\""),
            cfg.replace('"', "\\\""),
        );

        let _ = Command::new("sc")
            .args(["stop", SERVICE_NAME])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output();
        let deadline = std::time::Instant::now() + std::time::Duration::from_millis(1500);
        while std::time::Instant::now() < deadline {
            if !service_running(SERVICE_NAME) {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        let _ = Command::new("sc")
            .args(["delete", SERVICE_NAME])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output();

        let status = Command::new("sc")
            .args([
                "create",
                SERVICE_NAME,
                &format!("binPath= {}", bin_path),
                "type=",
                "own",
                "start=",
                "demand",
                &format!("DisplayName= {}", SERVICE_DISPLAY),
                "error=",
                "ignore",
            ])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("sc create failed: {}", e))?;

        if !status.status.success() {
            let stdout = String::from_utf8_lossy(&status.stdout).to_string();
            let stderr = String::from_utf8_lossy(&status.stderr).to_string();
            if !stdout.contains("1073") && !stderr.contains("1073") {
                return Err(format!("Service install failed: {} {}", stdout, stderr));
            }
        }

        let _ = Command::new("sc")
            .args([
                "description",
                SERVICE_NAME,
                "Whispera VPN network proxy and TUN routing",
            ])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output();

        let _ = Command::new("sc")
            .args(["config", SERVICE_NAME, "obj=", "LocalSystem"])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output();

        Ok(())
    }

    pub fn uninstall_service(&mut self) -> Result<(), String> {
        let _ = Command::new("sc")
            .args(["stop", SERVICE_NAME])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output();
        let deadline = std::time::Instant::now() + std::time::Duration::from_millis(2000);
        while std::time::Instant::now() < deadline {
            if !service_running(SERVICE_NAME) {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        Command::new("sc")
            .args(["delete", SERVICE_NAME])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(windows)]
    fn start_service(&mut self) -> Result<(), String> {
        let out = Command::new("sc")
            .args(["start", SERVICE_NAME])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        let stderr = String::from_utf8_lossy(&out.stderr).to_string();

        if out.status.success()
            || stdout.contains("RUNNING")
            || stderr.contains("1056")
            || stdout.contains("1056")
        {
            self.use_service = true;
            let deadline = std::time::Instant::now() + std::time::Duration::from_millis(1500);
            while std::time::Instant::now() < deadline {
                if service_running(SERVICE_NAME) {
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
            return Ok(());
        }

        Err(format!("sc start failed: {} {}", stdout, stderr))
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
            .args(["/F", "/IM", "mihomo.exe"])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output()
            .ok();
        self.use_service = false;
        Ok(())
    }

    pub fn start(&mut self, config_path: &Path) -> Result<(), String> {
        if self.is_running() {
            self.stop()?;
        }

        #[cfg(windows)]
        {
            if service_exists(SERVICE_NAME) {
                if self.install_service(config_path).is_ok() && self.start_service().is_ok() {
                    return Ok(());
                }
            }
            return if is_admin() {
                self.start_direct(config_path)
            } else {
                self.start_elevated(config_path)
            };
        }

        #[cfg(unix)]
        {
            // Best-effort: raise TUN capabilities on the binary (via pkexec if a
            // polkit agent is present) so mihomo can build the tun device without
            // root. If that is not possible (no pkexec/agent) we still start it
            // directly — mihomo comes up unprivileged and never hard-fails on
            // elevation; the mixed-port proxy works and TUN is best-effort.
            if !is_admin() && !mihomo_has_caps(&self.binary_path) {
                let _ = self.grant_caps();
            }
            return self.start_direct(config_path);
        }

        #[allow(unreachable_code)]
        Err("unsupported platform".to_string())
    }

    #[cfg(unix)]
    fn grant_caps(&self) -> Result<(), String> {
        let status = Command::new("pkexec")
            .arg(find_tool("setcap"))
            .arg("cap_net_admin,cap_net_bind_service=+ep")
            .arg(&self.binary_path)
            .status()
            .map_err(|e| format!("pkexec setcap: {}", e))?;
        if status.success() {
            Ok(())
        } else {
            Err("setcap denied".to_string())
        }
    }

    fn start_direct(&mut self, config_path: &Path) -> Result<(), String> {
        let home_dir = config_path.parent().unwrap_or(config_path);
        let mut cmd = Command::new(&self.binary_path);
        cmd.arg("-d").arg(home_dir).arg("-f").arg(config_path);
        cmd.stdout(Stdio::null()).stderr(Stdio::null());

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW | BELOW_NORMAL_PRIORITY_CLASS);

        let child = cmd
            .spawn()
            .map_err(|e| format!("Failed to start mihomo: {}", e))?;

        self.process = Some(child);
        self.elevated = false;
        self.use_service = false;
        Ok(())
    }

    #[cfg(windows)]
    fn start_elevated(&mut self, config_path: &Path) -> Result<(), String> {
        let bin = self.binary_path.to_string_lossy().to_string();
        let cfg = config_path.to_string_lossy().to_string();
        let home_dir = config_path
            .parent()
            .unwrap_or(config_path)
            .to_string_lossy()
            .to_string();

        let ps_cmd = format!(
            "Start-Process -FilePath '{}' -ArgumentList '-d','{}','-f','{}' -Verb RunAs -WindowStyle Hidden",
            bin.replace('\'', "''"),
            home_dir.replace('\'', "''"),
            cfg.replace('\'', "''")
        );

        let status = Command::new("powershell")
            .args([
                "-WindowStyle",
                "Hidden",
                "-NonInteractive",
                "-Command",
                &ps_cmd,
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags_win(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to elevate mihomo: {}", e))?
            .wait()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("UAC elevation was denied".to_string());
        }

        std::thread::sleep(std::time::Duration::from_millis(1000));
        self.process = None;
        self.elevated = true;
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

        #[cfg(windows)]
        {
            Command::new("taskkill")
                .args(["/F", "/IM", "mihomo.exe"])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .creation_flags_win(CREATE_NO_WINDOW)
                .spawn()
                .ok()
                .and_then(|mut c| c.wait().ok());

            if self.elevated || self.process.is_none() {
                Command::new("powershell")
                    .args([
                        "-WindowStyle", "Hidden", "-NonInteractive", "-Command",
                        "Start-Process -FilePath 'taskkill' -ArgumentList '/F','/IM','mihomo.exe' -Verb RunAs -WindowStyle Hidden -Wait",
                    ])
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .creation_flags_win(CREATE_NO_WINDOW)
                    .spawn()
                    .ok()
                    .and_then(|mut c| c.wait().ok());
            }
        }

        #[cfg(unix)]
        {
            Command::new("pkill")
                .args(["-9", "-x", "mihomo"])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .output()
                .ok();
        }

        self.process = None;
        self.elevated = false;
        Ok(())
    }

    pub fn kill_all_by_name(&self) {
        #[cfg(windows)]
        {
            Command::new("taskkill")
                .args(["/F", "/IM", "mihomo.exe"])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .creation_flags_win(CREATE_NO_WINDOW)
                .output()
                .ok();
        }
        #[cfg(unix)]
        {
            Command::new("pkill")
                .args(["-9", "-x", "mihomo"])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .output()
                .ok();
        }
    }

    pub fn is_running(&mut self) -> bool {
        if self.use_service {
            return service_running(SERVICE_NAME);
        }

        if let Some(ref mut child) = self.process {
            match child.try_wait() {
                Ok(Some(_)) => {
                    self.process = None;
                    false
                }
                Ok(None) => true,
                Err(_) => false,
            }
        } else if self.elevated {
            Command::new("tasklist")
                .args(["/FI", "IMAGENAME eq mihomo.exe", "/NH"])
                .creation_flags_win(CREATE_NO_WINDOW)
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).contains("mihomo.exe"))
                .unwrap_or(false)
        } else {
            false
        }
    }
}

impl Drop for MihomoManager {
    fn drop(&mut self) {
        self.stop().ok();
    }
}


#[cfg(windows)]
fn is_admin() -> bool {
    Command::new("net")
        .arg("session")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags_win(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(unix)]
fn is_admin() -> bool {
    Command::new("id")
        .arg("-u")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "0")
        .unwrap_or(false)
}

#[cfg(unix)]
fn find_tool(name: &str) -> String {
    for dir in ["/usr/sbin", "/sbin", "/usr/bin", "/bin"] {
        let p = format!("{}/{}", dir, name);
        if Path::new(&p).exists() {
            return p;
        }
    }
    name.to_string()
}

#[cfg(unix)]
fn mihomo_has_caps(bin: &Path) -> bool {
    Command::new(find_tool("getcap"))
        .arg(bin)
        .output()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .to_lowercase()
                .contains("cap_net_admin")
        })
        .unwrap_or(false)
}

#[cfg(windows)]
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


pub struct MihomoRoutingRule {
    pub kind: String,
    pub value: String,
    pub action: String,
}

pub struct MihomoConfig<'a> {
    pub socks_addr: &'a str,
    pub server_host: &'a str,
    pub mixed_port: u16,
    pub tun_stack: &'a str,
    pub dns_redirect: bool,
    pub ipv6: bool,
    pub routing_rules: &'a [MihomoRoutingRule],
    pub extra_socks_addrs: &'a [String],
    pub custom_dns: &'a [String],
    pub tls_fingerprint: &'a str,
    pub bypass_ru: bool,
    pub socks_user: &'a str,
    pub socks_pass: &'a str,
    pub allow_lan: bool,
    pub log_level: &'a str,
    pub routing_mode: &'a str,
}

fn map_fingerprint(fp: &str) -> &str {
    match fp {
        "chrome" | "chrome_120" | "chrome_115" => "chrome",
        "firefox" | "firefox_120" => "firefox",
        "safari" => "safari",
        "ios" => "ios",
        "android" => "android",
        "edge" => "edge",
        "random" => "random",
        _ => "chrome",
    }
}

pub fn generate_config(cfg: &MihomoConfig) -> String {
    let parts: Vec<&str> = cfg.socks_addr.splitn(2, ':').collect();
    let server = parts.first().copied().unwrap_or("127.0.0.1");
    let server_port: u16 = parts
        .get(1)
        .copied()
        .unwrap_or("1080")
        .parse()
        .unwrap_or(1080);

    let port = cfg.mixed_port;
    let tun_stack = cfg.tun_stack.to_lowercase();
    let ipv6 = cfg.ipv6;
    let nameservers: String = if cfg.custom_dns.is_empty() {
        "    - 77.88.8.8\n    - 77.88.8.1\n    - 8.8.8.8\n    - 1.1.1.1".to_string()
    } else {
        cfg.custom_dns.iter().map(|s| format!("    - {}", s)).collect::<Vec<_>>().join("\n")
    };

    // Build extra proxy entries and the proxy-group YAML.
    let mut extra_proxies = String::new();
    let mut all_proxy_names = vec!["whisp-server".to_string()];
    for (i, addr) in cfg.extra_socks_addrs.iter().enumerate() {
        let parts: Vec<&str> = addr.splitn(2, ':').collect();
        let h = parts.first().copied().unwrap_or("127.0.0.1");
        let p: u16 = parts.get(1).copied().unwrap_or("10900").parse().unwrap_or(10900);
        let name = format!("whisp-extra-{}", i);
        extra_proxies.push_str(&format!(
            "  - name: {name}\n    type: socks5\n    server: {h}\n    port: {p}\n    udp: true\n"
        ));
        all_proxy_names.push(name);
    }

    let proxy_group = if all_proxy_names.len() > 1 {
        let names_yaml: String = all_proxy_names.iter()
            .map(|n| format!("      - {}\n", n))
            .collect();
        format!(
            "  - name: PROXY\n    type: load-balance\n    strategy: round-robin\n    url: http://www.gstatic.com/generate_204\n    interval: 30\n    proxies:\n{}",
            names_yaml
        )
    } else {
        "  - name: PROXY\n    type: select\n    proxies:\n      - whisp-server\n".to_string()
    };

    let mut custom_rules = String::new();
    for rule in cfg.routing_rules {
        let action = &rule.action;
        match rule.kind.as_str() {
            "domain" => {
                custom_rules.push_str(&format!(
                    "  - DOMAIN-SUFFIX,{},{}\n",
                    rule.value, action
                ));
            }
            "domain-keyword" => {
                custom_rules.push_str(&format!(
                    "  - DOMAIN-KEYWORD,{},{}\n",
                    rule.value, action
                ));
            }
            "domain-full" => {
                custom_rules.push_str(&format!(
                    "  - DOMAIN,{},{}\n",
                    rule.value, action
                ));
            }
            "process" => {
                let exe_name = std::path::Path::new(&rule.value)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or(&rule.value);
                custom_rules.push_str(&format!("  - PROCESS-NAME,{},{}\n", exe_name, action));
            }
            "ip" => {
                if rule.value.contains('/') {
                    custom_rules.push_str(&format!(
                        "  - IP-CIDR,{},{},no-resolve\n",
                        rule.value, action
                    ));
                } else {
                    custom_rules.push_str(&format!(
                        "  - IP-CIDR,{}/32,{},no-resolve\n",
                        rule.value, action
                    ));
                }
            }
            _ => {}
        }
    }

    let fp = map_fingerprint(cfg.tls_fingerprint);
    let fp_line = if cfg.tls_fingerprint.is_empty() || cfg.tls_fingerprint == "chrome" {
        String::new()
    } else {
        format!("global-client-fingerprint: {fp}\n")
    };

    // DNS redirect: если включён — принудительно резолвим все домены через прокси
    // и отключаем fake-ip (переходим на redir-host). Так DNS-запросы уходят в тоннель,
    // а не к системному резолверу, и клиент видит реальные IP.
    // Без флага — старое поведение (fake-ip, быстрее, но DNS виден провайдеру).
    let (dns_enhanced_mode, dns_proxy_policy) = if cfg.dns_redirect {
        ("redir-host", "\n  proxy-server-nameserver:\n    - 1.1.1.1\n    - 8.8.8.8\n  nameserver-policy:\n    \"geosite:cn,!geolocation-!cn\": [ system ]\n    \"+.*\": [ 1.1.1.1, 8.8.8.8 ]")
    } else {
        ("fake-ip", "")
    };
    let _ = dns_proxy_policy; // пока только enhanced-mode меняем — policy требует geosite файлов

    let ru_rules = if cfg.bypass_ru {
        "  - DOMAIN-SUFFIX,ru,DIRECT\n  - DOMAIN-SUFFIX,su,DIRECT\n  - DOMAIN-SUFFIX,рф,DIRECT\n  - GEOIP,RU,DIRECT,no-resolve\n"
    } else {
        ""
    };

    let auth_block = if !cfg.socks_user.is_empty() && !cfg.socks_pass.is_empty() {
        format!("authentication:\n  - \"{}:{}\"\n", cfg.socks_user, cfg.socks_pass)
    } else {
        String::new()
    };

    let server_ip_valid = cfg.server_host.parse::<std::net::Ipv4Addr>().is_ok();
    let tun_exclude = if server_ip_valid {
        format!("  route-exclude-address:\n    - {}/32\n", cfg.server_host)
    } else {
        String::new()
    };
    let server_direct_rule = if server_ip_valid {
        format!("  - IP-CIDR,{}/32,DIRECT,no-resolve\n", cfg.server_host)
    } else {
        String::new()
    };

    let allow_lan = cfg.allow_lan;
    let _ = cfg.log_level;
    let log_level = "info";
    let routing_mode = match cfg.routing_mode { "global" | "direct" => cfg.routing_mode, _ => "rule" };

    format!(
        r#"mixed-port: {port}
allow-lan: {allow_lan}
{auth_block}
ipv6: {ipv6}
mode: {routing_mode}
{fp_line}log-level: {log_level}
external-controller: 127.0.0.1:9090
find-process-mode: strict

sniffer:
  enable: true
  sniff:
    HTTP:
      ports: [80, 8080-8090]
    TLS:
      ports: [443, 8443]
    QUIC:
      ports: [443, 8443]
  override-destination: true

dns:
  enable: true
  listen: 0.0.0.0:1053
  enhanced-mode: {dns_enhanced_mode}
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.ru"
    - "*.su"
    - "*.рф"
    - "*.lan"
    - "*.local"
    - "localhost"
    - "*.localhost"
    - "time.windows.com"
    - "time.nist.gov"
    - "time.apple.com"
    - "+.pool.ntp.org"
    - "+.stun.*.*"
    - "+.stun.*.*.*"
  nameserver:
{nameservers}

tun:
  enable: true
  stack: {tun_stack}
  device: Meta
  dns-hijack:
    - any:53
  auto-route: true
  auto-detect-interface: true
{tun_exclude}
proxies:
  - name: whisp-server
    type: socks5
    server: {server}
    port: {server_port}
    udp: true
{extra_proxies}
proxy-groups:
{proxy_group}

rules:
{server_direct_rule}{ru_rules}{custom_rules}  - IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,172.16.0.0/12,DIRECT,no-resolve
  - IP-CIDR,192.168.0.0/16,DIRECT,no-resolve
  - IP-CIDR,127.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,100.64.0.0/10,DIRECT,no-resolve
  - MATCH,PROXY
"#
    )
}

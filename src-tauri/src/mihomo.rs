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

/// How many mihomo processes the system currently has, ours included.
/// A leftover from a crashed run keeps the ports, so a second one would come
/// up useless and route nothing.
fn running_instances() -> usize {
    #[cfg(windows)]
    {
        let out = Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq mihomo.exe", "/NH"])
            .creation_flags_win(CREATE_NO_WINDOW)
            .output();
        return match out {
            Ok(o) => String::from_utf8_lossy(&o.stdout)
                .lines()
                .filter(|l| l.to_lowercase().contains("mihomo.exe"))
                .count(),
            Err(_) => 0,
        };
    }
    #[cfg(unix)]
    {
        let out = Command::new("pgrep").args(["-x", "mihomo"]).output();
        return match out {
            Ok(o) => String::from_utf8_lossy(&o.stdout)
                .lines()
                .filter(|l| !l.trim().is_empty())
                .count(),
            Err(_) => 0,
        };
    }
    #[allow(unreachable_code)]
    0
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

    #[cfg(windows)]
    pub fn service_installed() -> bool {
        service_exists(SERVICE_NAME)
    }

    #[cfg(windows)]
    pub fn remove_persistent_service(&mut self) -> Result<(), String> {
        let script = format!(
            "sc.exe stop {name} | Out-Null; sc.exe delete {name} | Out-Null",
            name = SERVICE_NAME
        );
        let status = Command::new("powershell")
            .args([
                "-WindowStyle",
                "Hidden",
                "-NonInteractive",
                "-Command",
                &format!(
                    "Start-Process powershell -ArgumentList '-WindowStyle','Hidden','-NonInteractive','-Command','{}' -Verb RunAs -WindowStyle Hidden -Wait",
                    script
                ),
            ])
            .creation_flags_win(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| format!("elevation failed: {}", e))?;
        if !status.success() {
            return Err("UAC elevation was denied".to_string());
        }
        self.use_service = false;
        Ok(())
    }

    #[cfg(windows)]
    pub fn install_persistent_service(&self, config_path: &Path) -> Result<(), String> {
        let bin = self.binary_path.to_string_lossy().to_string();
        let home = config_path
            .parent()
            .unwrap_or(config_path)
            .to_string_lossy()
            .to_string();
        let cfg = config_path.to_string_lossy().to_string();
        let bin_path = format!("\\\"{}\\\" -d \\\"{}\\\" -f \\\"{}\\\"", bin, home, cfg);

        let sid = current_user_sid()?;
        let sddl = format!(
            "D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWLOCRRC;;;IU)(A;;CCLCSWLOCRRC;;;SU)(A;;RPWPCR;;;{})",
            sid
        );

        let script = format!(
            "sc.exe stop {name} | Out-Null;              sc.exe delete {name} | Out-Null;              Start-Sleep -Milliseconds 300;              sc.exe create {name} binPath= '{bin}' type= own start= demand DisplayName= '{disp}' error= ignore | Out-Null;              sc.exe sdset {name} '{sddl}' | Out-Null",
            name = SERVICE_NAME,
            bin = bin_path,
            disp = SERVICE_DISPLAY,
            sddl = sddl,
        );

        let status = Command::new("powershell")
            .args([
                "-WindowStyle",
                "Hidden",
                "-NonInteractive",
                "-Command",
                &format!(
                    "Start-Process powershell -ArgumentList '-WindowStyle','Hidden','-NonInteractive','-Command',\"{}\" -Verb RunAs -WindowStyle Hidden -Wait",
                    script.replace('"', "`\"")
                ),
            ])
            .creation_flags_win(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| format!("elevation failed: {}", e))?;

        if !status.success() {
            return Err("UAC elevation was denied".to_string());
        }
        if !service_exists(SERVICE_NAME) {
            return Err("service was not created".to_string());
        }
        Ok(())
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

        // A leftover instance holds the ports, so starting a second one would
        // produce a process that routes nothing while the old config stays in
        // charge. Better to fail loudly than to run two.
        if running_instances() > 0 {
            self.stop()?;
            if running_instances() > 0 {
                return Err(
                    "another mihomo is already running and could not be stopped; \
                     close it and try again"
                        .to_string(),
                );
            }
        }

        #[cfg(windows)]
        {
            if service_exists(SERVICE_NAME) {
                if self.start_service().is_ok() {
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
            self.ensure_writable_binary();
            if !is_admin() && !mihomo_has_caps(&self.binary_path) {
                let _ = self.grant_caps();
            }
            return self.start_direct(config_path);
        }

        #[allow(unreachable_code)]
        Err("unsupported platform".to_string())
    }

    #[cfg(unix)]
    #[cfg(unix)]
    fn ensure_writable_binary(&mut self) {
        use std::os::unix::fs::PermissionsExt;

        let Some(dir) = self.binary_path.parent().map(|d| d.to_path_buf()) else {
            return;
        };
        let probe = dir.join(".whisp-write-probe");
        if std::fs::write(&probe, b"1").is_ok() {
            let _ = std::fs::remove_file(&probe);
            return;
        }

        let base = std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")))
            .unwrap_or_else(|| PathBuf::from("/tmp"));
        let dst_dir = base.join("com.whispera.whisp").join("bin");
        if std::fs::create_dir_all(&dst_dir).is_err() {
            return;
        }
        let Some(name) = self.binary_path.file_name() else {
            return;
        };
        let dst = dst_dir.join(name);

        let same = match (std::fs::metadata(&dst), std::fs::metadata(&self.binary_path)) {
            (Ok(a), Ok(b)) => a.len() == b.len(),
            _ => false,
        };
        if !same && std::fs::copy(&self.binary_path, &dst).is_err() {
            return;
        }
        let _ = std::fs::set_permissions(&dst, std::fs::Permissions::from_mode(0o755));
        self.binary_path = dst;
    }

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
            return api_reachable();
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
            api_reachable()
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
#[cfg(windows)]
fn current_user_sid() -> Result<String, String> {
    let out = Command::new("powershell")
        .args([
            "-NonInteractive",
            "-Command",
            "[Security.Principal.WindowsIdentity]::GetCurrent().User.Value",
        ])
        .creation_flags_win(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("sid lookup: {}", e))?;
    let sid = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if sid.is_empty() {
        return Err("could not read the current user SID".to_string());
    }
    Ok(sid)
}

fn service_exists(name: &str) -> bool {
    Command::new("sc")
        .args(["query", name])
        .creation_flags_win(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn api_reachable() -> bool {
    let Ok(addr) = "127.0.0.1:9090".parse::<std::net::SocketAddr>() else {
        return false;
    };
    std::net::TcpStream::connect_timeout(&addr, std::time::Duration::from_millis(120)).is_ok()
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

pub fn external_proxy_yaml(link: &str, name: &str) -> Option<String> {
    let link = link.trim();
    let (scheme, rest) = link.split_once("://")?;
    let (rest, _tag) = match rest.split_once('#') {
        Some((r, t)) => (r, t),
        None => (rest, ""),
    };
    let (body, query) = match rest.split_once('?') {
        Some((b, q)) => (b, q),
        None => (rest, ""),
    };
    let opts = query_map(query);

    match scheme.to_ascii_lowercase().as_str() {
        "vless" => {
            let (uuid, hostport) = body.split_once('@')?;
            let (host, port) = split_host_port(hostport)?;
            let mut y = format!(
                "  - name: {name}\n    type: vless\n    server: {host}\n    port: {port}\n    uuid: {uuid}\n    udp: true\n"
            );
            let network = opts.get("type").map(String::as_str).unwrap_or("tcp");
            y.push_str(&format!("    network: {}\n", if network.is_empty() { "tcp" } else { network }));
            let security = opts.get("security").map(String::as_str).unwrap_or("");
            if security == "tls" || security == "reality" {
                y.push_str("    tls: true\n");
            }
            if let Some(sni) = opts.get("sni").filter(|v| !v.is_empty()) {
                y.push_str(&format!("    servername: {sni}\n"));
            }
            if let Some(fp) = opts.get("fp").filter(|v| !v.is_empty()) {
                y.push_str(&format!("    client-fingerprint: {fp}\n"));
            }
            if let Some(flow) = opts.get("flow").filter(|v| !v.is_empty()) {
                y.push_str(&format!("    flow: {flow}\n"));
            }
            if security == "reality" {
                let pbk = opts.get("pbk").filter(|v| !v.is_empty())?;
                y.push_str("    reality-opts:\n");
                y.push_str(&format!("      public-key: {pbk}\n"));
                if let Some(sid) = opts.get("sid").filter(|v| !v.is_empty()) {
                    y.push_str(&format!("      short-id: \"{sid}\"\n"));
                }
            }
            Some(y)
        }
        "hysteria2" | "hy2" => {
            let (password, hostport) = body.split_once('@')?;
            let (host, port) = split_host_port(hostport)?;
            let mut y = format!(
                "  - name: {name}\n    type: hysteria2\n    server: {host}\n    port: {port}\n    password: \"{password}\"\n"
            );
            if let Some(sni) = opts.get("sni").filter(|v| !v.is_empty()) {
                y.push_str(&format!("    sni: {sni}\n"));
            }
            if opts.get("insecure").map(String::as_str) == Some("1") {
                y.push_str("    skip-cert-verify: true\n");
            }
            if let Some(obfs) = opts.get("obfs").filter(|v| !v.is_empty()) {
                y.push_str(&format!("    obfs: {obfs}\n"));
                if let Some(pw) = opts.get("obfs-password").filter(|v| !v.is_empty()) {
                    y.push_str(&format!("    obfs-password: {pw}\n"));
                }
            }
            Some(y)
        }
        "trojan" => {
            let (password, hostport) = body.split_once('@')?;
            let (host, port) = split_host_port(hostport)?;
            let mut y = format!(
                "  - name: {name}\n    type: trojan\n    server: {host}\n    port: {port}\n    password: \"{password}\"\n    udp: true\n"
            );
            if let Some(sni) = opts.get("sni").filter(|v| !v.is_empty()) {
                y.push_str(&format!("    sni: {sni}\n"));
            }
            if let Some(fp) = opts.get("fp").filter(|v| !v.is_empty()) {
                y.push_str(&format!("    client-fingerprint: {fp}\n"));
            }
            Some(y)
        }
        "ss" => {
            let (userinfo, hostport) = body.split_once('@')?;
            let decoded = decode_b64(userinfo).unwrap_or_else(|| userinfo.to_string());
            let (cipher, password) = decoded.split_once(':')?;
            let (host, port) = split_host_port(hostport)?;
            Some(format!(
                "  - name: {name}\n    type: ss\n    server: {host}\n    port: {port}\n    cipher: {cipher}\n    password: \"{password}\"\n    udp: true\n"
            ))
        }
        _ => None,
    }
}

fn query_map(q: &str) -> std::collections::HashMap<String, String> {
    let mut out = std::collections::HashMap::new();
    for pair in q.split('&') {
        if pair.is_empty() {
            continue;
        }
        let (k, v) = pair.split_once('=').unwrap_or((pair, ""));
        out.insert(k.to_ascii_lowercase(), percent_decode(v));
    }
    out
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn split_host_port(s: &str) -> Option<(String, u16)> {
    let (h, p) = s.rsplit_once(':')?;
    let host = h.trim_matches(|c| c == '[' || c == ']').to_string();
    if host.is_empty() {
        return None;
    }
    Some((host, p.parse().ok()?))
}

fn decode_b64(s: &str) -> Option<String> {
    const T: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let clean: Vec<u8> = s
        .bytes()
        .map(|c| match c {
            b'-' => b'+',
            b'_' => b'/',
            other => other,
        })
        .filter(|c| *c != b'=' && !c.is_ascii_whitespace())
        .collect();
    let mut bits = 0u32;
    let mut n = 0;
    let mut out = Vec::new();
    for c in clean {
        let v = T.iter().position(|t| *t == c)? as u32;
        bits = (bits << 6) | v;
        n += 6;
        if n >= 8 {
            n -= 8;
            out.push((bits >> n) as u8);
        }
    }
    String::from_utf8(out).ok()
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
    pub socks_user: &'a str,
    pub socks_pass: &'a str,
    pub allow_lan: bool,
    pub log_level: &'a str,
    pub routing_mode: &'a str,
    pub bypass_ru: bool,
    pub external_link: &'a str,
}


fn valid_nameserver(s: &str) -> bool {
    let s = s.trim();
    if s.is_empty() {
        return false;
    }
    if s == "system" || s.contains("://") {
        return true;
    }
    if s.parse::<std::net::IpAddr>().is_ok() || s.parse::<std::net::SocketAddr>().is_ok() {
        return true;
    }
    let host = match s.rsplit_once(':') {
        Some((h, port)) if !port.is_empty() && port.chars().all(|c| c.is_ascii_digit()) => h,
        _ => s,
    };
    host.len() > 3 && host.contains('.') && !host.starts_with('.') && !host.ends_with('.')
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
    let picked: Vec<&String> = cfg
        .custom_dns
        .iter()
        .filter(|s| valid_nameserver(s))
        .collect();
    let nameservers: String = if picked.is_empty() {
        "    - 77.88.8.8\n    - 77.88.8.1\n    - 8.8.8.8\n    - 1.1.1.1".to_string()
    } else {
        picked
            .iter()
            .map(|s| format!("    - {}", s.trim()))
            .collect::<Vec<_>>()
            .join("\n")
    };

    // Build extra proxy entries and the proxy-group YAML.
    let mut extra_proxies = String::new();
    let mut all_proxy_names = vec!["whisp-server".to_string()];
    for (i, addr) in cfg.extra_socks_addrs.iter().enumerate() {
        let parts: Vec<&str> = addr.splitn(2, ':').collect();
        let h = parts.first().copied().unwrap_or("127.0.0.1");
        let p: u16 = parts
            .get(1)
            .copied()
            .unwrap_or("10900")
            .parse()
            .unwrap_or(10900);
        let name = format!("whisp-extra-{}", i);
        extra_proxies.push_str(&format!(
            "  - name: {name}\n    type: socks5\n    server: {h}\n    port: {p}\n    udp: true\n"
        ));
        all_proxy_names.push(name);
    }

    let proxy_group = if all_proxy_names.len() > 1 {
        let names_yaml: String = all_proxy_names
            .iter()
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
                custom_rules.push_str(&format!("  - DOMAIN-SUFFIX,{},{}\n", rule.value, action));
            }
            "domain-keyword" => {
                custom_rules.push_str(&format!("  - DOMAIN-KEYWORD,{},{}\n", rule.value, action));
            }
            "domain-full" => {
                custom_rules.push_str(&format!("  - DOMAIN,{},{}\n", rule.value, action));
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


    let primary_proxy = external_proxy_yaml(cfg.external_link, "whisp-server").unwrap_or_else(|| {
        // Reached only when there is no external profile at all: an unparsable one
        // is refused earlier, so a broken link can never quietly become our tunnel.
        format!(
            "  - name: whisp-server\n    type: socks5\n    server: {}\n    port: {}\n    udp: true\n",
            server, server_port
        )
    });

    let ru_rules = if cfg.bypass_ru {
        "  - DOMAIN-SUFFIX,ru,DIRECT\n  - DOMAIN-SUFFIX,su,DIRECT\n  - DOMAIN-SUFFIX,рф,DIRECT\n  - GEOIP,RU,DIRECT,no-resolve\n"
    } else {
        ""
    };

    // DNS redirect: если включён — принудительно резолвим все домены через прокси
    // и отключаем fake-ip (переходим на redir-host). Так DNS-запросы уходят в тоннель,
    // а не к системному резолверу, и клиент видит реальные IP.
    // Без флага — старое поведение (fake-ip, быстрее, но DNS виден провайдеру).
    let dns_enhanced_mode = if cfg.dns_redirect { "redir-host" } else { "fake-ip" };
    let dns_proxy_policy = if cfg.dns_redirect {
        format!("  proxy-server-nameserver:\n{}\n", nameservers)
    } else {
        String::new()
    };

    let auth_block = if !cfg.socks_user.is_empty() && !cfg.socks_pass.is_empty() {
        format!(
            "authentication:\n  - \"{}:{}\"\n",
            cfg.socks_user, cfg.socks_pass
        )
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
    let routing_mode = match cfg.routing_mode {
        "global" | "direct" => cfg.routing_mode,
        _ => "rule",
    };

    format!(
        r#"mixed-port: {port}
allow-lan: {allow_lan}
{auth_block}
ipv6: {ipv6}
mode: {routing_mode}
log-level: {log_level}
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
{dns_proxy_policy}  enhanced-mode: {dns_enhanced_mode}
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
{primary_proxy}{extra_proxies}
proxy-groups:
{proxy_group}

rules:
{server_direct_rule}{custom_rules}{ru_rules}  - IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,172.16.0.0/12,DIRECT,no-resolve
  - IP-CIDR,192.168.0.0/16,DIRECT,no-resolve
  - IP-CIDR,127.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,100.64.0.0/10,DIRECT,no-resolve
  - MATCH,PROXY
"#
    )
}

#[cfg(test)]
mod tests {
    use super::external_proxy_yaml;

    #[test]
    fn vless_reality_link_becomes_a_proxy() {
        let link = "vless://11111111-2222-3333-4444-555555555555@example.com:443\
?type=tcp&security=reality&pbk=abcPUBKEY&sid=01ab&fp=chrome&sni=www.example.org\
&flow=xtls-rprx-vision#my%20node";
        let y = external_proxy_yaml(link, "whisp-server").expect("must parse");

        for needle in [
            "name: whisp-server",
            "type: vless",
            "server: example.com",
            "port: 443",
            "uuid: 11111111-2222-3333-4444-555555555555",
            "tls: true",
            "servername: www.example.org",
            "client-fingerprint: chrome",
            "flow: xtls-rprx-vision",
            "public-key: abcPUBKEY",
            "short-id: \"01ab\"",
        ] {
            assert!(y.contains(needle), "missing {needle} in:\n{y}");
        }
    }

    #[test]
    fn trojan_link_becomes_a_proxy() {
        let y = external_proxy_yaml("trojan://pass@example.com:8443?sni=cdn.example.org", "p")
            .expect("must parse");
        assert!(y.contains("type: trojan"), "{y}");
        assert!(y.contains("password: \"pass\""), "{y}");
        assert!(y.contains("sni: cdn.example.org"), "{y}");
    }

    #[test]
    fn shadowsocks_link_decodes_userinfo() {
        // base64 of "aes-256-gcm:secret"
        let y = external_proxy_yaml("ss://YWVzLTI1Ni1nY206c2VjcmV0@example.com:8388", "p")
            .expect("must parse");
        assert!(y.contains("cipher: aes-256-gcm"), "{y}");
        assert!(y.contains("password: \"secret\""), "{y}");
    }

    #[test]
    fn unknown_scheme_is_rejected() {
        assert!(external_proxy_yaml("https://example.com", "p").is_none());
        assert!(external_proxy_yaml("", "p").is_none());
    }
}

#[cfg(test)]
mod hysteria_tests {
    use super::external_proxy_yaml;

    #[test]
    fn hysteria2_link_becomes_a_proxy() {
        let y = external_proxy_yaml(
            "hysteria2://secret@example.com:8443?sni=cdn.example.org&insecure=1",
            "whisp-server",
        )
        .expect("must parse");
        assert!(y.contains("type: hysteria2"), "{y}");
        assert!(y.contains("password: \"secret\""), "{y}");
        assert!(y.contains("sni: cdn.example.org"), "{y}");
        assert!(y.contains("skip-cert-verify: true"), "{y}");
    }
}

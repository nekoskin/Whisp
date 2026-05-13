//! Запуск sing-box (sagernet) как child process с TUN-fd через JSON config.
//!
//! Бинарь хранится под именем mihomo-aarch64-linux-android (для совместимости
//! с pipeline'ом). Sing-box принимает fd напрямую в JSON inbound.
//!
//! CLI: `sing-box run -c <config.json>`

use crate::rules::RoutingRule;
use std::fs;
use std::os::unix::io::RawFd;
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};

pub struct MihomoChild {
    pub child: Child,
    pub work_dir: PathBuf,
}

impl MihomoChild {
    pub fn kill(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let _ = fs::remove_dir_all(&self.work_dir);
    }
}

pub fn spawn_mihomo(
    bin_path: &Path,
    tun_fd: RawFd,
    socks_upstream: Option<&str>,
    _rules: &[RoutingRule],
    tun_stack: &str,
) -> Result<MihomoChild, String> {
    if !bin_path.exists() {
        return Err(format!("sing-box not found at {}", bin_path.display()));
    }

    let work_dir = std::env::temp_dir().join(format!("whisp-singbox-{}", std::process::id()));
    fs::create_dir_all(&work_dir).map_err(|e| format!("mkdir work_dir: {}", e))?;

    let cfg = generate_config(tun_fd, socks_upstream, tun_stack);
    let cfg_path = work_dir.join("config.json");
    fs::write(&cfg_path, &cfg).map_err(|e| format!("write config.json: {}", e))?;

    let mut cmd = Command::new(bin_path);
    cmd.arg("run").arg("-c").arg(&cfg_path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let preserve_fd = tun_fd;
    unsafe {
        cmd.pre_exec(move || {
            let flags = libc::fcntl(preserve_fd, libc::F_GETFD);
            if flags < 0 { return Err(std::io::Error::last_os_error()); }
            if libc::fcntl(preserve_fd, libc::F_SETFD, flags & !libc::FD_CLOEXEC) < 0 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        });
    }

    let mut child = cmd.spawn().map_err(|e| format!("spawn sing-box: {}", e))?;
    if let Some(s) = child.stdout.take() { drain_subprocess(s, "singbox") }
    if let Some(s) = child.stderr.take() { drain_subprocess(s, "singbox") }
    Ok(MihomoChild { child, work_dir })
}

fn drain_subprocess<R: std::io::Read + Send + 'static>(src: R, tag: &'static str) {
    std::thread::spawn(move || {
        use std::io::BufRead;
        let reader = std::io::BufReader::new(src);
        for line in reader.lines() {
            if let Ok(l) = line {
                if l.trim().is_empty() { continue; }
                let msg = format!("[{}] {}", tag, l);
                eprintln!("{}", msg);
                crate::push_log(msg);
            }
        }
    });
}


fn generate_config(tun_fd: RawFd, socks_upstream: Option<&str>, tun_stack: &str) -> String {
    let stack = match tun_stack.to_lowercase().as_str() {
        "gvisor" | "mixed" => tun_stack,
        _ => "system",
    };

    // DoT через SOCKS5 когда есть upstream — go-client не поддерживает UDP ASSOCIATE,
    // поэтому plain UDP DNS через SOCKS5 не работает. DoT = TCP = работает.
    let (final_outbound, outbounds_extra, dns_tag, dns_addr, dns_detour) = match socks_upstream {
        Some(addr) => {
            let (host, port) = addr.split_once(':').unwrap_or(("127.0.0.1", "1080"));
            (
                "upstream",
                format!(
                    r#",
    {{
      "type": "socks",
      "tag": "upstream",
      "server": "{host}",
      "server_port": {port},
      "version": "5"
    }}"#
                ),
                "dns-proxy",
                "tls://1.1.1.1",
                "upstream",
            )
        }
        None => ("direct", String::new(), "dns-direct", "1.1.1.1", "direct"),
    };

    format!(
        r#"{{
  "log": {{ "level": "warn" }},
  "dns": {{
    "servers": [
      {{
        "tag": "{dns_tag}",
        "address": "{dns_addr}",
        "detour": "{dns_detour}"
      }}
    ],
    "final": "{dns_tag}"
  }},
  "inbounds": [
    {{
      "type": "tun",
      "tag": "tun-in",
      "mtu": 1500,
      "auto_route": false,
      "auto_redirect": false,
      "endpoint_independent_nat": false,
      "stack": "{stack}",
      "address": ["10.55.55.2/24"],
      "fd": {tun_fd},
      "sniff": true,
      "sniff_override_destination": true
    }}
  ],
  "outbounds": [
    {{ "type": "direct", "tag": "direct" }},
    {{ "type": "block",  "tag": "block" }}{outbounds_extra}
  ],
  "route": {{
    "final": "{final_outbound}",
    "auto_detect_interface": false
  }}
}}
"#
    )
}

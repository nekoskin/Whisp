use std::ffi::CString;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::ffi::OsStrExt;
use std::os::unix::fs::PermissionsExt;
use std::os::unix::io::AsRawFd;
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::{Duration, Instant};

pub const HELPER_FLAG: &str = "--tun-helper";

const LABEL: &str = "com.whispera.whisp.tun-helper";
const INSTALL_DIR: &str = "/Library/PrivilegedHelperTools";
const LAUNCH_DAEMONS_DIR: &str = "/Library/LaunchDaemons";
const LOG_DIR: &str = "/Library/Logs";
const SOCKET_DIR: &str = "/var/run";
const INSTALL_OWNER: &str = "root";
const INSTALL_GROUP: &str = "wheel";
const BINARY_MODE: &str = "755";
const PLIST_MODE: &str = "644";
const QUARANTINE_ATTRIBUTE: &str = "com.apple.quarantine";

const ARG_SOCKET: &str = "--socket";
const ARG_OWNER_UID: &str = "--owner-uid";
const ARG_MIHOMO: &str = "--mihomo";
const ARG_HOME: &str = "--home";
const ARG_CONFIG: &str = "--config";

const REQUEST_START: &str = "start";
const REQUEST_STOP: &str = "stop";
const REQUEST_STATUS: &str = "status";
const REPLY_OK: &str = "ok";
const REPLY_RUNNING: &str = "running";
const REPLY_STOPPED: &str = "stopped";
const REPLY_DENIED: &str = "denied";
const REPLY_ERROR: &str = "error";

const SOCKET_MODE: u32 = 0o600;
const STOP_GRACE: Duration = Duration::from_secs(3);
const STOP_POLL: Duration = Duration::from_millis(50);
const REPLY_TIMEOUT: Duration = Duration::from_secs(10);
#[cfg(target_os = "macos")]
const INSTALL_WAIT: Duration = Duration::from_secs(15);
#[cfg(target_os = "macos")]
const INSTALL_POLL: Duration = Duration::from_millis(200);

#[derive(Clone, Debug, PartialEq)]
pub struct HelperSettings {
    pub socket: PathBuf,
    pub owner_uid: u32,
    pub mihomo: PathBuf,
    pub home: PathBuf,
    pub config: PathBuf,
}

impl HelperSettings {
    #[cfg(target_os = "macos")]
    pub fn for_current_user(config: &Path) -> Self {
        Self {
            socket: socket_path(),
            owner_uid: current_uid(),
            mihomo: installed_mihomo(),
            home: config.parent().unwrap_or(config).to_path_buf(),
            config: config.to_path_buf(),
        }
    }

    fn to_args(&self) -> Vec<String> {
        vec![
            ARG_SOCKET.to_string(),
            self.socket.to_string_lossy().into_owned(),
            ARG_OWNER_UID.to_string(),
            self.owner_uid.to_string(),
            ARG_MIHOMO.to_string(),
            self.mihomo.to_string_lossy().into_owned(),
            ARG_HOME.to_string(),
            self.home.to_string_lossy().into_owned(),
            ARG_CONFIG.to_string(),
            self.config.to_string_lossy().into_owned(),
        ]
    }

    fn from_args(args: &[String]) -> Result<Self, String> {
        let value = |name: &str| {
            args.iter()
                .position(|arg| arg == name)
                .and_then(|i| args.get(i + 1))
                .ok_or_else(|| format!("missing {name}"))
        };
        Ok(Self {
            socket: PathBuf::from(value(ARG_SOCKET)?),
            owner_uid: value(ARG_OWNER_UID)?
                .parse()
                .map_err(|_| format!("{ARG_OWNER_UID} must be a number"))?,
            mihomo: PathBuf::from(value(ARG_MIHOMO)?),
            home: PathBuf::from(value(ARG_HOME)?),
            config: PathBuf::from(value(ARG_CONFIG)?),
        })
    }
}

pub fn socket_path() -> PathBuf {
    Path::new(SOCKET_DIR).join(format!("{LABEL}.sock"))
}

fn installed_helper() -> PathBuf {
    Path::new(INSTALL_DIR).join(LABEL)
}

fn installed_mihomo() -> PathBuf {
    Path::new(INSTALL_DIR).join(format!("{LABEL}.mihomo"))
}

fn installed_plist() -> PathBuf {
    Path::new(LAUNCH_DAEMONS_DIR).join(format!("{LABEL}.plist"))
}

fn current_uid() -> u32 {
    unsafe { libc::getuid() }
}

#[cfg(target_os = "macos")]
pub fn run_if_requested() -> Option<Result<(), String>> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.first().map(String::as_str) != Some(HELPER_FLAG) {
        return None;
    }
    Some(HelperSettings::from_args(&args[1..]).and_then(|settings| serve(&settings)))
}

#[derive(Default)]
struct Mihomo {
    child: Option<Child>,
    owner: u64,
}

fn lock(mihomo: &Mutex<Mihomo>) -> MutexGuard<'_, Mihomo> {
    mihomo.lock().unwrap_or_else(PoisonError::into_inner)
}

fn serve(settings: &HelperSettings) -> Result<(), String> {
    let listener = bind(settings).map_err(|e| format!("{}: {e}", settings.socket.display()))?;
    let mihomo = Arc::new(Mutex::new(Mihomo::default()));
    let next_connection = AtomicU64::new(1);
    for stream in listener.incoming().flatten() {
        let connection = next_connection.fetch_add(1, Ordering::Relaxed);
        let settings = settings.clone();
        let mihomo = Arc::clone(&mihomo);
        std::thread::spawn(move || serve_connection(stream, connection, &settings, &mihomo));
    }
    Ok(())
}

fn bind(settings: &HelperSettings) -> std::io::Result<UnixListener> {
    let _ = std::fs::remove_file(&settings.socket);
    let listener = UnixListener::bind(&settings.socket)?;
    let path = CString::new(settings.socket.as_os_str().as_bytes())?;
    if unsafe { libc::chown(path.as_ptr(), settings.owner_uid, libc::gid_t::MAX) } != 0 {
        return Err(std::io::Error::last_os_error());
    }
    std::fs::set_permissions(
        &settings.socket,
        std::fs::Permissions::from_mode(SOCKET_MODE),
    )?;
    Ok(listener)
}

fn serve_connection(
    stream: UnixStream,
    connection: u64,
    settings: &HelperSettings,
    mihomo: &Mutex<Mihomo>,
) {
    let Ok(mut writer) = stream.try_clone() else {
        return;
    };
    if peer_uid(&stream) != Some(settings.owner_uid) {
        let _ = writeln!(writer, "{REPLY_DENIED}");
        return;
    }
    for line in BufReader::new(stream).lines() {
        let Ok(request) = line else {
            break;
        };
        let reply = match request.trim() {
            REQUEST_START => start_mihomo(settings, connection, mihomo),
            REQUEST_STOP => {
                terminate(&mut lock(mihomo).child);
                REPLY_OK.to_string()
            }
            REQUEST_STATUS => mihomo_status(mihomo).to_string(),
            other => format!("{REPLY_ERROR} unknown request {other:?}"),
        };
        if writeln!(writer, "{reply}").is_err() {
            break;
        }
    }
    let mut state = lock(mihomo);
    if state.owner == connection {
        terminate(&mut state.child);
    }
}

fn start_mihomo(settings: &HelperSettings, connection: u64, mihomo: &Mutex<Mihomo>) -> String {
    let mut state = lock(mihomo);
    terminate(&mut state.child);
    let spawned = Command::new(&settings.mihomo)
        .arg("-d")
        .arg(&settings.home)
        .arg("-f")
        .arg(&settings.config)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();
    match spawned {
        Ok(child) => {
            state.child = Some(child);
            state.owner = connection;
            REPLY_OK.to_string()
        }
        Err(e) => format!("{REPLY_ERROR} {e}"),
    }
}

fn mihomo_status(mihomo: &Mutex<Mihomo>) -> &'static str {
    let mut state = lock(mihomo);
    let alive = state
        .child
        .as_mut()
        .is_some_and(|child| matches!(child.try_wait(), Ok(None)));
    if !alive {
        state.child = None;
    }
    if alive {
        REPLY_RUNNING
    } else {
        REPLY_STOPPED
    }
}

fn terminate(slot: &mut Option<Child>) {
    let Some(mut child) = slot.take() else {
        return;
    };
    if let Ok(pid) = libc::pid_t::try_from(child.id()) {
        unsafe {
            libc::kill(pid, libc::SIGTERM);
        }
    }
    let deadline = Instant::now() + STOP_GRACE;
    while Instant::now() < deadline {
        if matches!(child.try_wait(), Ok(Some(_))) {
            return;
        }
        std::thread::sleep(STOP_POLL);
    }
    let _ = child.kill();
    let _ = child.wait();
}

#[cfg(target_os = "macos")]
fn peer_uid(stream: &UnixStream) -> Option<u32> {
    let mut uid: libc::uid_t = 0;
    let mut gid: libc::gid_t = 0;
    (unsafe { libc::getpeereid(stream.as_raw_fd(), &mut uid, &mut gid) } == 0).then_some(uid)
}

#[cfg(target_os = "linux")]
fn peer_uid(stream: &UnixStream) -> Option<u32> {
    let mut cred = libc::ucred {
        pid: 0,
        uid: 0,
        gid: 0,
    };
    let mut len = std::mem::size_of::<libc::ucred>() as libc::socklen_t;
    let rc = unsafe {
        libc::getsockopt(
            stream.as_raw_fd(),
            libc::SOL_SOCKET,
            libc::SO_PEERCRED,
            (&mut cred as *mut libc::ucred).cast(),
            &mut len,
        )
    };
    (rc == 0).then_some(cred.uid)
}

pub fn request_start(socket: &Path) -> Result<UnixStream, String> {
    let mut stream = connect(socket)?;
    expect_ok(&exchange(&mut stream, REQUEST_START)?)?;
    Ok(stream)
}

pub fn request_stop(stream: &mut UnixStream) -> Result<(), String> {
    expect_ok(&exchange(stream, REQUEST_STOP)?)
}

pub fn is_running(socket: &Path) -> Result<bool, String> {
    let mut stream = connect(socket)?;
    match exchange(&mut stream, REQUEST_STATUS)?.as_str() {
        REPLY_RUNNING => Ok(true),
        REPLY_STOPPED => Ok(false),
        other => Err(describe_failure(other)),
    }
}

fn connect(socket: &Path) -> Result<UnixStream, String> {
    let stream = UnixStream::connect(socket)
        .map_err(|e| format!("TUN helper is not reachable at {}: {e}", socket.display()))?;
    stream
        .set_read_timeout(Some(REPLY_TIMEOUT))
        .map_err(|e| e.to_string())?;
    Ok(stream)
}

fn exchange(stream: &mut UnixStream, request: &str) -> Result<String, String> {
    let sent = writeln!(stream, "{request}");
    let mut reply = String::new();
    let received = BufReader::new(&*stream).read_line(&mut reply);
    if !reply.trim().is_empty() {
        return Ok(reply.trim().to_string());
    }
    sent.and(received.map(|_| ()))
        .map_err(|e| format!("TUN helper: {e}"))?;
    Ok(String::new())
}

fn expect_ok(reply: &str) -> Result<(), String> {
    if reply == REPLY_OK {
        Ok(())
    } else {
        Err(describe_failure(reply))
    }
}

fn describe_failure(reply: &str) -> String {
    match reply {
        REPLY_DENIED => "TUN helper belongs to another user".to_string(),
        "" => "TUN helper closed the connection".to_string(),
        other => format!("TUN helper: {other}"),
    }
}

#[cfg(target_os = "macos")]
pub fn ensure_installed(settings: &HelperSettings, mihomo_source: &Path) -> Result<(), String> {
    let helper_source = std::env::current_exe().map_err(|e| e.to_string())?;
    let plist = launchd_plist(settings, &installed_helper());
    let current = std::fs::read_to_string(installed_plist())
        .is_ok_and(|installed| installed == plist)
        && same_contents(&helper_source, &installed_helper())
        && same_contents(mihomo_source, &installed_mihomo())
        && is_running(&settings.socket).is_ok();
    if current {
        return Ok(());
    }
    let staging = std::env::temp_dir().join(LABEL);
    std::fs::create_dir_all(&staging).map_err(|e| e.to_string())?;
    let staged_plist = staging.join(format!("{LABEL}.plist"));
    std::fs::write(&staged_plist, plist).map_err(|e| e.to_string())?;
    let script = staging.join("install.sh");
    std::fs::write(
        &script,
        install_script(&helper_source, mihomo_source, &staged_plist),
    )
    .map_err(|e| e.to_string())?;
    run_as_administrator(&script)?;
    wait_until_reachable(&settings.socket)
}

#[cfg(target_os = "macos")]
pub fn uninstall() -> Result<(), String> {
    let script = std::env::temp_dir().join(format!("{LABEL}-uninstall.sh"));
    std::fs::write(&script, uninstall_script()).map_err(|e| e.to_string())?;
    run_as_administrator(&script)
}

#[cfg(target_os = "macos")]
pub fn is_installed() -> bool {
    installed_plist().exists()
}

#[cfg(target_os = "macos")]
fn same_contents(source: &Path, installed: &Path) -> bool {
    match (
        crate::sidecar_sha256(source),
        crate::sidecar_sha256(installed),
    ) {
        (Some(a), Some(b)) => a == b,
        _ => false,
    }
}

#[cfg(target_os = "macos")]
fn run_as_administrator(script: &Path) -> Result<(), String> {
    let status = Command::new("osascript")
        .args([
            "-e",
            "on run argv",
            "-e",
            "do shell script \"/bin/sh \" & quoted form of (item 1 of argv) with administrator privileges",
            "-e",
            "end run",
        ])
        .arg(script)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|e| format!("osascript: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err("administrator rights were not granted".to_string())
    }
}

#[cfg(target_os = "macos")]
fn wait_until_reachable(socket: &Path) -> Result<(), String> {
    let deadline = Instant::now() + INSTALL_WAIT;
    loop {
        match is_running(socket) {
            Ok(_) => return Ok(()),
            Err(e) if Instant::now() >= deadline => return Err(e),
            Err(_) => std::thread::sleep(INSTALL_POLL),
        }
    }
}

fn install_script(helper_source: &Path, mihomo_source: &Path, plist_source: &Path) -> String {
    let install = |mode: &str, from: &Path, to: &Path| {
        format!(
            "install -o {INSTALL_OWNER} -g {INSTALL_GROUP} -m {mode} {} {}",
            shell_quote(from),
            shell_quote(to)
        )
    };
    [
        "set -e".to_string(),
        format!("mkdir -p {}", shell_quote(Path::new(INSTALL_DIR))),
        format!("launchctl bootout system/{LABEL} 2>/dev/null || true"),
        install(BINARY_MODE, helper_source, &installed_helper()),
        install(BINARY_MODE, mihomo_source, &installed_mihomo()),
        format!(
            "xattr -d {QUARANTINE_ATTRIBUTE} {} {} 2>/dev/null || true",
            shell_quote(&installed_helper()),
            shell_quote(&installed_mihomo())
        ),
        install(PLIST_MODE, plist_source, &installed_plist()),
        format!(
            "launchctl bootstrap system {}",
            shell_quote(&installed_plist())
        ),
    ]
    .join("\n")
        + "\n"
}

fn uninstall_script() -> String {
    [
        format!("launchctl bootout system/{LABEL} 2>/dev/null || true"),
        format!(
            "rm -f {} {} {} {}",
            shell_quote(&installed_plist()),
            shell_quote(&installed_helper()),
            shell_quote(&installed_mihomo()),
            shell_quote(&socket_path())
        ),
    ]
    .join("\n")
        + "\n"
}

fn launchd_plist(settings: &HelperSettings, helper: &Path) -> String {
    let log = Path::new(LOG_DIR).join(format!("{LABEL}.log"));
    let arguments = std::iter::once(helper.to_string_lossy().into_owned())
        .chain(std::iter::once(HELPER_FLAG.to_string()))
        .chain(settings.to_args())
        .map(|arg| format!("    <string>{}</string>", xml_escape(&arg)));
    let mut lines = vec![
        r#"<?xml version="1.0" encoding="UTF-8"?>"#.to_string(),
        r#"<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">"#.to_string(),
        r#"<plist version="1.0">"#.to_string(),
        "<dict>".to_string(),
        "  <key>Label</key>".to_string(),
        format!("  <string>{LABEL}</string>"),
        "  <key>ProgramArguments</key>".to_string(),
        "  <array>".to_string(),
    ];
    lines.extend(arguments);
    lines.extend([
        "  </array>".to_string(),
        "  <key>RunAtLoad</key>".to_string(),
        "  <true/>".to_string(),
        "  <key>KeepAlive</key>".to_string(),
        "  <true/>".to_string(),
        "  <key>StandardErrorPath</key>".to_string(),
        format!("  <string>{}</string>", xml_escape(&log.to_string_lossy())),
        "</dict>".to_string(),
        "</plist>".to_string(),
    ]);
    lines.join("\n") + "\n"
}

fn shell_quote(path: &Path) -> String {
    format!("'{}'", path.to_string_lossy().replace('\'', "'\\''"))
}

fn xml_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_WAIT: Duration = Duration::from_secs(5);

    fn wait_for(mut condition: impl FnMut() -> bool) -> bool {
        let deadline = Instant::now() + TEST_WAIT;
        while Instant::now() < deadline {
            if condition() {
                return true;
            }
            std::thread::sleep(STOP_POLL);
        }
        false
    }

    struct Stand {
        dir: PathBuf,
        settings: HelperSettings,
    }

    impl Stand {
        fn new(name: &str) -> Self {
            let dir = std::env::temp_dir().join(format!("{LABEL}-{name}-{}", std::process::id()));
            let _ = std::fs::remove_dir_all(&dir);
            std::fs::create_dir_all(&dir).unwrap();
            let mihomo = dir.join("mihomo");
            std::fs::write(
                &mihomo,
                format!(
                    "#!/bin/sh\necho \"$@\" > '{}'\nexec sleep 600\n",
                    dir.join("args").display()
                ),
            )
            .unwrap();
            std::fs::set_permissions(&mihomo, std::fs::Permissions::from_mode(0o755)).unwrap();
            let settings = HelperSettings {
                socket: dir.join("helper.sock"),
                owner_uid: current_uid(),
                mihomo,
                home: dir.join("home dir"),
                config: dir.join("home dir").join("config.yaml"),
            };
            let serving = settings.clone();
            std::thread::spawn(move || serve(&serving));
            assert!(
                wait_for(|| UnixStream::connect(&settings.socket).is_ok()),
                "helper did not listen"
            );
            Self { dir, settings }
        }

        fn running(&self) -> bool {
            is_running(&self.settings.socket).unwrap()
        }
    }

    impl Drop for Stand {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.dir);
        }
    }

    #[test]
    fn settings_survive_the_command_line() {
        let settings = HelperSettings {
            socket: PathBuf::from("/var/run/x.sock"),
            owner_uid: 501,
            mihomo: PathBuf::from("/Library/PrivilegedHelperTools/x.mihomo"),
            home: PathBuf::from("/Users/a b/Library/Application Support/whisp"),
            config: PathBuf::from("/Users/a b/Library/Application Support/whisp/config.yaml"),
        };
        assert_eq!(HelperSettings::from_args(&settings.to_args()), Ok(settings));
        assert!(HelperSettings::from_args(&[ARG_SOCKET.to_string()]).is_err());
    }

    #[test]
    fn start_runs_mihomo_and_stop_ends_it() {
        let stand = Stand::new("start-stop");
        let mut session = request_start(&stand.settings.socket).unwrap();
        assert!(stand.running());
        let args_file = stand.dir.join("args");
        assert!(wait_for(|| args_file.exists()));
        let expected = format!(
            "-d {} -f {}",
            stand.settings.home.display(),
            stand.settings.config.display()
        );
        assert_eq!(
            std::fs::read_to_string(&args_file).unwrap().trim(),
            expected
        );
        request_stop(&mut session).unwrap();
        assert!(!stand.running());
    }

    #[test]
    fn mihomo_stops_when_the_app_goes_away() {
        let stand = Stand::new("app-gone");
        let session = request_start(&stand.settings.socket).unwrap();
        assert!(stand.running());
        drop(session);
        assert!(
            wait_for(|| !stand.running()),
            "mihomo outlived the app that started it"
        );
    }

    #[test]
    fn another_user_is_refused() {
        let (mut app, helper_end) = UnixStream::pair().unwrap();
        let settings = HelperSettings {
            socket: PathBuf::new(),
            owner_uid: current_uid().wrapping_add(1),
            mihomo: PathBuf::from("/nonexistent/mihomo"),
            home: PathBuf::new(),
            config: PathBuf::new(),
        };
        let mihomo = Mutex::new(Mihomo::default());
        serve_connection(helper_end, 1, &settings, &mihomo);
        assert_eq!(exchange(&mut app, REQUEST_START).unwrap(), REPLY_DENIED);
        assert!(describe_failure(REPLY_DENIED).contains("another user"));
        assert!(lock(&mihomo).child.is_none());
    }

    #[test]
    fn socket_is_private_to_its_owner() {
        let stand = Stand::new("socket-mode");
        let mode = std::fs::metadata(&stand.settings.socket)
            .unwrap()
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, SOCKET_MODE);
    }

    #[test]
    fn install_script_quotes_every_path() {
        let script = install_script(
            Path::new("/Applications/Whisp.app/Contents/MacOS/Whisp"),
            Path::new("/Users/o'neil/Whisp/mihomo"),
            Path::new("/tmp/with space/helper.plist"),
        );
        assert!(script.starts_with("set -e\n"));
        assert!(
            script.contains(&format!(
                "xattr -d {QUARANTINE_ATTRIBUTE} {} {}",
                shell_quote(&installed_helper()),
                shell_quote(&installed_mihomo())
            )),
            "{script}"
        );
        assert!(
            script.contains("'/Users/o'\\''neil/Whisp/mihomo'"),
            "{script}"
        );
        assert!(
            script.contains("'/tmp/with space/helper.plist'"),
            "{script}"
        );
        assert!(script.ends_with(&format!(
            "launchctl bootstrap system {}\n",
            shell_quote(&installed_plist())
        )));
    }

    #[test]
    fn uninstall_removes_what_install_put_in_place() {
        let script = uninstall_script();
        assert!(script.starts_with(&format!("launchctl bootout system/{LABEL}")));
        for installed in [
            installed_plist(),
            installed_helper(),
            installed_mihomo(),
            socket_path(),
        ] {
            assert!(script.contains(&shell_quote(&installed)), "{script}");
        }
    }

    #[test]
    fn plist_runs_the_helper_with_its_settings() {
        let settings = HelperSettings {
            socket: socket_path(),
            owner_uid: 501,
            mihomo: installed_mihomo(),
            home: PathBuf::from("/Users/a&b/whisp"),
            config: PathBuf::from("/Users/a&b/whisp/config.yaml"),
        };
        let plist = launchd_plist(&settings, &installed_helper());
        assert!(plist.contains(&format!("<string>{LABEL}</string>")));
        assert!(plist.contains(&format!("<string>{HELPER_FLAG}</string>")));
        assert!(plist.contains("<string>/Users/a&amp;b/whisp/config.yaml</string>"));
        assert!(plist.contains("<key>KeepAlive</key>\n  <true/>"));
        assert!(!plist.contains("a&b"));
    }
}

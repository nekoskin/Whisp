use sha2::{Digest, Sha256};
use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

const APPLE_TARGET_SUFFIX: &str = "apple-darwin";
const UNIVERSAL_APPLE_TARGET: &str = "universal-apple-darwin";

fn hash_file(path: &Path) -> Option<String> {
    let bytes = fs::read(path).ok()?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Some(format!("{:x}", hasher.finalize()))
}

fn main() {
    let target = env::var("TARGET").unwrap_or_default();
    let is_windows = target.contains("windows");
    let ext = if is_windows { ".exe" } else { "" };

    let crate_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".into()));
    let bins_dir = crate_dir.join("binaries");

    let sidecars = ["mihomo", "whispera-go-client"];
    let mut entries: Vec<(String, String)> = Vec::new();

    for name in sidecars {
        let mut candidates = vec![bins_dir.join(format!("{}-{}{}", name, target, ext))];
        if target.ends_with(APPLE_TARGET_SUFFIX) {
            candidates.push(bins_dir.join(format!("{}-{}", name, UNIVERSAL_APPLE_TARGET)));
        }
        let found = candidates
            .iter()
            .find_map(|src| hash_file(src).map(|hex| (src, hex)));
        if let Some((src, hex)) = found {
            entries.push((format!("{}{}", name, ext), hex));
            println!("cargo:rerun-if-changed={}", src.display());
        }
    }

    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR"));
    let dest = out_dir.join("sidecar_hashes.rs");
    let mut f = fs::File::create(&dest).expect("create sidecar_hashes.rs");
    writeln!(f, "pub static SIDECAR_HASHES: &[(&str, &str)] = &[").unwrap();
    for (name, hex) in &entries {
        writeln!(f, "    (\"{}\", \"{}\"),", name, hex).unwrap();
    }
    writeln!(f, "];").unwrap();

    println!("cargo:rerun-if-changed=binaries");
    tauri_build::build();
}

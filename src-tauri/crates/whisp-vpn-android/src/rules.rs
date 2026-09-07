//! Rules engine — порт логики mihomo routing на чистый Rust.
//! Сначала минимум: domain suffix, domain keyword, IP-CIDR, process name (на Android
//! вместо process будет package name / UID). Расширяем по мере реальной нужды.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum RoutingAction {
    /// Напрямую в сеть, минуя тоннель.
    Direct,
    /// Через тоннель (proxy).
    Proxy,
    /// Дропнуть трафик.
    Reject,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum RoutingRule {
    DomainSuffix {
        suffix: String,
        action: RoutingAction,
    },
    DomainKeyword {
        keyword: String,
        action: RoutingAction,
    },
    DomainExact {
        domain: String,
        action: RoutingAction,
    },
    IpCidr {
        cidr: String,
        action: RoutingAction,
    },
    /// Android: pkg = com.example.app. Desktop: process exe name.
    ProcessName {
        name: String,
        action: RoutingAction,
    },
    Fallback {
        action: RoutingAction,
    },
}

pub struct RulesEngine {
    rules: Vec<RoutingRule>,
}

impl RulesEngine {
    pub fn new() -> Self {
        Self { rules: Vec::new() }
    }

    pub fn load_from_json(&mut self, json: &str) -> Result<usize, String> {
        let parsed: Vec<RoutingRule> =
            serde_json::from_str(json).map_err(|e| format!("json parse: {}", e))?;
        let n = parsed.len();
        self.rules = parsed;
        Ok(n)
    }

    pub fn rules(&self) -> &[RoutingRule] {
        &self.rules
    }

    /// Порядок вычисления: последовательный по списку (как mihomo). Первое
    /// совпадение — действие. Если ни одно не матчит, берём Fallback-правило
    /// либо Direct как жёсткий дефолт.
    pub fn evaluate_domain(&self, host: &str) -> RoutingAction {
        let host_lower = host.to_ascii_lowercase();
        for rule in &self.rules {
            match rule {
                RoutingRule::DomainExact { domain, action } => {
                    if host_lower == domain.to_ascii_lowercase() {
                        return *action;
                    }
                }
                RoutingRule::DomainSuffix { suffix, action } => {
                    if host_lower.ends_with(&suffix.to_ascii_lowercase()) {
                        return *action;
                    }
                }
                RoutingRule::DomainKeyword { keyword, action } => {
                    if host_lower.contains(&keyword.to_ascii_lowercase()) {
                        return *action;
                    }
                }
                RoutingRule::Fallback { action } => return *action,
                _ => {}
            }
        }
        RoutingAction::Direct
    }
}

impl Default for RulesEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn domain_suffix_matches() {
        let mut e = RulesEngine::new();
        e.load_from_json(
            r#"[
            {"kind":"domain-suffix","suffix":"vk.com","action":"DIRECT"},
            {"kind":"fallback","action":"PROXY"}
        ]"#,
        )
        .unwrap();
        assert_eq!(e.evaluate_domain("login.vk.com"), RoutingAction::Direct);
        assert_eq!(e.evaluate_domain("google.com"), RoutingAction::Proxy);
    }

    #[test]
    fn order_matters() {
        // Более специфичное правило должно идти раньше.
        let mut e = RulesEngine::new();
        e.load_from_json(
            r#"[
            {"kind":"domain-exact","domain":"m.vk.com","action":"PROXY"},
            {"kind":"domain-suffix","suffix":"vk.com","action":"DIRECT"}
        ]"#,
        )
        .unwrap();
        assert_eq!(e.evaluate_domain("m.vk.com"), RoutingAction::Proxy);
        assert_eq!(e.evaluate_domain("login.vk.com"), RoutingAction::Direct);
    }

    #[test]
    fn no_match_defaults_direct() {
        let e = RulesEngine::new();
        assert_eq!(e.evaluate_domain("whatever.com"), RoutingAction::Direct);
    }
}

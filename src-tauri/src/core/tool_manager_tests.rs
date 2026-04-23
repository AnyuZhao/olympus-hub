#[cfg(test)]
mod tests {
    use crate::models::{DependencyInstallMethod, DependencySpec};
    use crate::core::tool_manager::select_install_method;

    fn method(id: &str, platforms: &[&str]) -> DependencyInstallMethod {
        DependencyInstallMethod {
            id: id.to_string(),
            label: id.to_string(),
            platforms: platforms.iter().map(|item| item.to_string()).collect(),
            commands: vec![format!("echo {}", id)],
        }
    }

    #[test]
    fn select_install_method_prefers_current_platform() {
        let methods = vec![
            method("brew", &["macos"]),
            method("winget", &["windows"]),
            method("fallback", &[]),
        ];

        let selected = select_install_method(&methods).expect("expected a matching install method");
        assert_eq!(selected.id, if cfg!(target_os = "windows") { "winget" } else if cfg!(target_os = "macos") { "brew" } else { "fallback" });
    }

    #[test]
    fn dependency_spec_deserializes_install_methods() {
        let raw = r#"{
          "id": "nodejs",
          "display_name": "Node.js",
          "min_version": "22.0.0",
          "check_command": "node --version",
          "version_regex": "v(\\d+\\.\\d+\\.\\d+)",
          "install_guide": "https://nodejs.org",
          "install_methods": [
            {
              "id": "winget",
              "label": "使用 winget 安装",
              "platforms": ["windows"],
              "commands": ["winget install OpenJS.NodeJS.LTS"]
            }
          ],
          "required": true
        }"#;

        let spec: DependencySpec = serde_json::from_str(raw).expect("dependency spec should deserialize");
        assert_eq!(spec.install_methods.len(), 1);
        assert_eq!(spec.install_methods[0].id, "winget");
    }
}

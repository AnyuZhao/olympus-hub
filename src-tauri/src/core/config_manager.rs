use crate::models::Tool;

const EMBEDDED_TOOL_CONFIGS: [&str; 1] = [include_str!("../../../tools/codex.json")];

fn parse_tool(raw: &str, source: &str) -> Option<Tool> {
    match serde_json::from_str::<Tool>(raw) {
        Ok(tool) => Some(tool),
        Err(error) => {
            eprintln!("Failed to parse tool config from {source}: {error}");
            None
        }
    }
}

pub fn load_tools(app_data_dir: &std::path::Path) -> Vec<Tool> {
    let mut tools = Vec::new();

    for raw in EMBEDDED_TOOL_CONFIGS {
        if let Some(tool) = parse_tool(raw, "embedded") {
            tools.push(tool);
        }
    }

    let custom_dir = app_data_dir.join("custom_tools");
    let _ = std::fs::create_dir_all(&custom_dir);

    if let Ok(entries) = std::fs::read_dir(&custom_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|item| item.to_str()) != Some("json") {
                continue;
            }

            match std::fs::read_to_string(&path) {
                Ok(content) => {
                    if let Some(tool) = parse_tool(&content, &path.display().to_string()) {
                        tools.push(tool);
                    }
                }
                Err(error) => eprintln!("Failed to read tool config {}: {error}", path.display()),
            }
        }
    }

    tools
}

#[cfg(test)]
mod tests {
    use super::load_tools;

    #[test]
    fn load_tools_contains_embedded_codex() {
        let app_data_dir = std::env::temp_dir().join("olympus-hub-config-read-tests");
        std::fs::create_dir_all(&app_data_dir).unwrap();

        let loaded = load_tools(&app_data_dir);
        assert!(loaded.iter().any(|item| item.id == "codex"));

        let _ = std::fs::remove_dir_all(app_data_dir);
    }
}

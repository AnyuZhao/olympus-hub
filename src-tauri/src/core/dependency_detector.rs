use crate::models::{DependencyCheckResult, DependencySpec, DependencyStatus};
use regex::Regex;

pub async fn check_dependency(spec: &DependencySpec) -> DependencyCheckResult {
    let output = run_check_command(&spec.check_command);

    match output {
        Err(_) => DependencyCheckResult {
            id: spec.id.clone(),
            display_name: spec.display_name.clone(),
            status: DependencyStatus::Missing,
            current_version: None,
            required_version: spec.min_version.clone(),
            message: format!("{} 未安装或不在 PATH 中", spec.display_name),
            install_guide: spec.install_guide.clone(),
            install_methods: spec.install_methods.clone(),
        },
        Ok(combined) => parse_version_result(spec, &combined),
    }
}

fn run_check_command(cmd: &str) -> Result<String, ()> {
    let output = shell_command(cmd)
        .output()
        .map_err(|_| ())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok(format!("{stdout}{stderr}"))
}

fn parse_version_result(spec: &DependencySpec, output: &str) -> DependencyCheckResult {
    let Ok(re) = Regex::new(&spec.version_regex) else {
        return DependencyCheckResult {
            id: spec.id.clone(),
            display_name: spec.display_name.clone(),
            status: DependencyStatus::CheckFailed,
            current_version: None,
            required_version: spec.min_version.clone(),
            message: format!("版本正则无效: {}", spec.version_regex),
            install_guide: spec.install_guide.clone(),
            install_methods: spec.install_methods.clone(),
        };
    };

    let Some(caps) = re.captures(output) else {
        return DependencyCheckResult {
            id: spec.id.clone(),
            display_name: spec.display_name.clone(),
            status: DependencyStatus::CheckFailed,
            current_version: None,
            required_version: spec.min_version.clone(),
            message: format!("无法从输出中解析 {} 的版本号", spec.display_name),
            install_guide: spec.install_guide.clone(),
            install_methods: spec.install_methods.clone(),
        };
    };

    let current_ver = caps.get(1).map(|m| m.as_str().to_string()).unwrap_or_default();

    if version_satisfies(&current_ver, &spec.min_version) {
        DependencyCheckResult {
            id: spec.id.clone(),
            display_name: spec.display_name.clone(),
            status: DependencyStatus::Satisfied,
            current_version: Some(current_ver.clone()),
            required_version: spec.min_version.clone(),
            message: format!(
                "{} {} 已满足要求（需要 >= {}）",
                spec.display_name, current_ver, spec.min_version
            ),
            install_guide: spec.install_guide.clone(),
            install_methods: spec.install_methods.clone(),
        }
    } else {
        DependencyCheckResult {
            id: spec.id.clone(),
            display_name: spec.display_name.clone(),
            status: DependencyStatus::VersionInsufficient,
            current_version: Some(current_ver.clone()),
            required_version: spec.min_version.clone(),
            message: format!(
                "{} 版本 {} 低于要求的 {}",
                spec.display_name, current_ver, spec.min_version
            ),
            install_guide: spec.install_guide.clone(),
            install_methods: spec.install_methods.clone(),
        }
    }
}

/// Simple semver-style version comparison (major.minor.patch).
fn version_satisfies(current: &str, required: &str) -> bool {
    let parse = |s: &str| -> Vec<u64> {
        s.split('.')
            .map(|p| p.split('-').next().unwrap_or(p).parse().unwrap_or(0))
            .collect()
    };
    let cur = parse(current);
    let req = parse(required);
    let len = cur.len().max(req.len());
    for i in 0..len {
        let c = cur.get(i).copied().unwrap_or(0);
        let r = req.get(i).copied().unwrap_or(0);
        if c > r {
            return true;
        }
        if c < r {
            return false;
        }
    }
    true
}

/// Build a platform-appropriate shell command.
pub fn shell_command(cmd: &str) -> std::process::Command {
    #[cfg(target_os = "windows")]
    {
        let mut c = std::process::Command::new("cmd");
        c.args(["/C", cmd]);
        // Suppress console window
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x08000000);
        c
    }
    #[cfg(not(target_os = "windows"))]
    {
        let mut c = std::process::Command::new("sh");
        c.args(["-c", cmd]);
        c
    }
}

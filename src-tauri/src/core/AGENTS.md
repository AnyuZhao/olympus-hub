# CORE RUNTIME KNOWLEDGE BASE

## OVERVIEW
`src-tauri/src/core/` 是 Olympus Hub 的真实业务核心：工具配置加载、依赖/环境检测、安装命令执行、日志流式写入、运行时状态与取消逻辑都在这里。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 全局运行时状态 | `mod.rs` | `AppState`、状态/设置持久化、安装目录解析 |
| 工具配置装载 | `config_manager.rs` | `include_str!` 内嵌 `tools/codex.json` |
| 依赖检测 | `dependency_detector.rs` | shell 执行、版本正则、简单 semver 比较 |
| 环境评估 | `env_validator.rs` | OS / 磁盘 / 网络 / 依赖结果聚合 |
| 安装/启动/卸载 | `tool_manager.rs` | 状态转换、日志推送、取消标记、子进程管理 |
| 日志持久化 | `log_manager.rs` | JSONL 追加、尾部读取、清空 |

## CONVENTIONS
- shell 命令统一通过 `dependency_detector::shell_command` 构建，Windows 下会隐藏额外 console。
- 安装命令支持 `${INSTALL_DIR}` 占位符；目录优先级是工具覆盖 > 全局设置 > 系统默认。
- 状态变更后立即 `emit_status(...)`，再让前端通过事件刷新 UI。
- 安装日志同时写磁盘和发事件；不要只做其中一半。
- `finish_install(...)` 是安装成功/失败收口点；改安装结果语义优先从这里入手。
- `core/` 下新增或修改的后端业务逻辑必须带测试；至少覆盖新增分支、关键约束和失败路径。

## ANTI-PATTERNS
- 不要在 `tool_manager.rs` 绕过 `finish_install` 直接散落设置状态，否则前端事件和日志会失配。
- 不要把长生命周期状态放局部变量；需要跨命令共享的都应该进 `AppState`。
- 不要让前端参与依赖/环境判定；`overall` 结论必须由 `env_validator.rs` 单点给出。
- 不要把工具定义复制到 Rust 代码里；新增工具优先改 `tools/*.json`，然后让 `config_manager` 解析。

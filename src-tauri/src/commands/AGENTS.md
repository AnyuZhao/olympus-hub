# TAURI COMMANDS KNOWLEDGE BASE

## OVERVIEW
`src-tauri/src/commands/` 是前端 `invoke` 的 Rust 入口层，只做参数校验、状态防抖、state 提取和异步派发。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 工具列表/状态/安装/启动/卸载 | `tool.rs` | 对应 `get_tool_list`、`install_tool`、`launch_tool` 等 IPC |
| 设置读取/保存 | `settings.rs` | 校验安装目录，保存后 emit `settings_changed` |
| 安装日志读取 | `log.rs` | 调 `log_manager::read`，默认 limit 500 |
| command 模块注册 | `mod.rs`, `../lib.rs` | 新 command 需要同时加入 `generate_handler!` |

## CONVENTIONS
- command 返回 `Result<_, String>`，错误码当前直接用字符串如 `ALREADY_INSTALLING`。
- 耗时操作通过 `tauri::async_runtime::spawn` 丢给 core，不阻塞 invoke 响应。
- `State<'_, Arc<AppState>>` 是共享状态入口；需要跨 async move 时用 `state.inner().clone()`。
- 保存设置成功后必须广播 `settings_changed`，让多窗口状态同步。

## ANTI-PATTERNS
- 不要把安装/启动/卸载的具体执行逻辑写在 command 层。
- 不要新增 command 后忘记在 `src-tauri/src/lib.rs` 的 `generate_handler!` 注册。
- 不要在 command 层直接改前端事件名；事件 payload 模型在 `models/`，事件发射多在 `core/`。
- 不要把可选布尔参数裸 unwrap；现有 `keep_config.unwrap_or(false)` 是默认值模式。

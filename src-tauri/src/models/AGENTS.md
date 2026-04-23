# TAURI MODELS KNOWLEDGE BASE

## OVERVIEW
`src-tauri/src/models/` 定义所有跨 IPC 和运行时持久化使用的 serde 模型；这里的结构必须与前端 `src/types/index.ts` 保持同步。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 工具定义与状态 | `tool.rs` | `Tool`、`ToolStatus`、依赖检测、event payload |
| 应用设置 | `settings.rs` | `AppSettings` 与 `SettingsChangedPayload` |
| 安装日志 | `log_entry.rs` | `LogEntry`、`LogLevel`、`InstallStage`、时间戳 |
| re-export | `mod.rs` | `pub use` 聚合所有模型 |

## CONVENTIONS
- `ToolStatus` 使用 `#[serde(tag = "type", content = "data")]`，前端对应 `{ type, data }` 判别联合。
- `ToolWithStatus` 通过 `#[serde(flatten)]` 把 `Tool` 字段和 `status` 合并给前端。
- event payload struct 只派生 `Clone, Serialize`，不是所有 payload 都需要反序列化。
- `AppSettings::default()` 当前表示 `install_dir: None`。
- `now_ms()` 用 Unix 毫秒，前端 `LogViewer` 按本地时间格式化。

## ANTI-PATTERNS
- 不要只改 Rust 模型不改 `src/types/index.ts`；这会让 Tauri IPC 在运行时才暴露错配。
- 不要改 `ToolStatus` 的 serde tag/content 形式，除非同步迁移全部前端状态判断。
- 不要把 UI-only 字段塞进 Rust 模型；展示派生值应留在前端组件或 store。
- 不要让日志 stage 与前端 `STAGE_LABEL` 脱节；新增 stage 时同步更新 `LogViewer.tsx`。

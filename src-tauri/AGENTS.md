# TAURI BACKEND KNOWLEDGE BASE

## OVERVIEW
`src-tauri/` 是桌面壳与 Rust 后端：Tauri 配置、命令注册、运行时状态、系统调用、日志持久化、工具配置解析都在这里。

## STRUCTURE
```text
src-tauri/
├── Cargo.toml         # Rust/Tauri 依赖与 release 优化
├── tauri.conf.json    # Tauri 应用窗口、build、bundle 配置
├── capabilities/      # Tauri capability 配置
├── src/
│   ├── main.rs        # 原生入口
│   ├── lib.rs         # Builder / setup / command registration
│   ├── commands/      # Tauri command handlers
│   ├── core/          # 业务核心
│   └── models/        # 序列化模型
└── gen/schemas/       # 生成产物，通常不改
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Tauri 启动与 state 注入 | `src/lib.rs` | `setup` 创建 app data 目录并注入 `AppState` |
| command 注册 | `src/lib.rs`, `src/commands/*.rs` | 所有 invoke 入口集中在这里 |
| 安装/启动/卸载流程 | `src/core/tool_manager.rs` | 最复杂、最关键的运行时逻辑 |
| 工具与设置持久化 | `src/core/mod.rs` | `AppState`、状态落盘、设置落盘 |
| 工具配置加载 | `src/core/config_manager.rs`, `../tools/*.json` | 当前采用 `include_str!` 内嵌 |
| 环境与依赖检测 | `src/core/env_validator.rs`, `src/core/dependency_detector.rs` | 阻塞项和警告项在这里决策 |
| 日志读写与前端推送 | `src/core/log_manager.rs` | JSONL + `log_appended` 事件 |
| 窗口/构建配置 | `tauri.conf.json`, `.cargo/config.toml` | 端口、bundle、GNU 工具链都在这里 |

## CONVENTIONS
- `commands/` 只做参数校验、状态防抖和异步派发，重逻辑放 `core/`。
- 序列化模型集中在 `models/`；改 IPC 结构时先改模型，再同步前端 `src/types/index.ts`。
- app data 下的 `tool_states.json` 只持久化终态，安装中/启动中不会落盘。
- `tauri.conf.json` 依赖前端 `npm run dev` 和 `npm run build`；桌面构建链路与 Vite 强绑定。
- 后端新增或修改业务实现时，必须同时补充或更新对应 Rust 测试；没有测试的后端实现视为未完成。

## ANTI-PATTERNS
- 不要手改 `gen/schemas/*.json`；这是生成物。
- 不要在 `commands/` 复制 `tool_manager` 逻辑；保持 command 薄、core 厚。
- 不要删除 `main.rs` 的 Windows 子系统属性；release 行为依赖它。
- 不要假设 MSVC 工具链；仓库当前通过 `.cargo/config.toml` 明确走 `x86_64-pc-windows-gnu`。

# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-20
**Commit:** a6311fd
**Branch:** main

## OVERVIEW
Olympus Hub 是一个基于 **Tauri v2 + React 18 + TypeScript + Zustand + Rust** 的桌面应用，用来安装、检测、启动和管理 AI 工具。
当前仓库是单应用而非 monorepo，前端集中在 `src/`，桌面后端与系统能力在 `src-tauri/`，工具定义由 `tools/*.json` 驱动。

## STRUCTURE
```text
olympus-hub/
├── src/                 # React UI、路由、状态、Tauri invoke 封装
├── src-tauri/           # Tauri/Rust 应用壳、命令处理、核心业务
├── tools/               # 内嵌工具配置，当前只有 codex.json
├── docs/technical/      # 架构、数据模型、核心流程、IPC 设计文档
├── .cargo/              # Windows GNU 目标链路与 PATH 注入
└── vite.config.ts       # 前端 dev server 固定在 1420，忽略 src-tauri 热更新
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 应用入口 | `src/main.tsx`, `src/App.tsx` | React 根挂载 + 路由树 |
| 页面骨架与导航 | `src/components/Layout.tsx` | 左侧导航、Outlet 容器 |
| 工具列表与状态同步 | `src/pages/ToolListPage.tsx`, `src/stores/useToolStore.ts` | 监听 `tool_status_changed` |
| 安装流程 | `src/pages/InstallWizardPage.tsx`, `src/stores/useInstallStore.ts` | 环境检查 → 安装日志 → 完成态 |
| 设置保存 | `src/pages/SettingsPage.tsx`, `src/stores/useSettingsStore.ts` | 安装目录选择与持久化 |
| 前后端 IPC 契约 | `src/api/tauri.ts`, `src/types/index.ts` | TS 侧 invoke 包装与 payload 类型 |
| Tauri 启动与命令注册 | `src-tauri/src/lib.rs` | `setup`、state 注入、`generate_handler!` |
| Rust 命令层 | `src-tauri/src/commands/*.rs` | 轻薄 command，业务下沉到 core |
| Rust 核心业务 | `src-tauri/src/core/*.rs` | 安装、启动、环境检测、日志、配置 |
| 运行时模型 | `src-tauri/src/models/*.rs` | Tool / Status / Env / Log / Settings |
| 工具定义来源 | `tools/codex.json`, `src-tauri/src/core/config_manager.rs` | JSON 内嵌进二进制 |

## CODE MAP
| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `App` | React component | `src/App.tsx` | route root | 定义所有页面路由 |
| `api` | object | `src/api/tauri.ts` | 多页面/多 store | 前端唯一 IPC 调用面 |
| `useToolStore` | Zustand store | `src/stores/useToolStore.ts` | 列表页、卡片页 | 工具列表与状态缓存 |
| `useInstallStore` | Zustand store | `src/stores/useInstallStore.ts` | 安装页 | 安装步骤与日志缓存 |
| `run` | function | `src-tauri/src/lib.rs` | app entry | 创建 Tauri app 与共享状态 |
| `AppState` | struct | `src-tauri/src/core/mod.rs` | commands/core | 工具、状态、设置、进程、取消标记总状态 |
| `install_tool` | async fn | `src-tauri/src/core/tool_manager.rs` | command -> core | 顺序执行安装命令并流式记日志 |
| `check_environment` | async fn | `src-tauri/src/core/env_validator.rs` | command -> core | OS/磁盘/网络/依赖检测 |
| `load_tools` | fn | `src-tauri/src/core/config_manager.rs` | setup | 解析内嵌工具 JSON |

## CONVENTIONS
- 前端不直接拼 IPC 名称；统一通过 `src/api/tauri.ts` 调用。
- 页面层负责监听 Tauri events，store 负责保存结果；事件名当前固定为 `tool_status_changed` / `install_complete` / `log_appended` / `settings_changed`。
- Rust command 层保持很薄，实际逻辑集中在 `src-tauri/src/core/`。
- 后端实现必须有对应 Rust 测试；新增或修改 `src-tauri/src/commands`、`src-tauri/src/core`、`src-tauri/src/models` 的业务行为时，必须同步新增或更新测试。
- 工具能力走“配置驱动”：依赖检查、安装命令、启动命令、卸载命令来自 `tools/*.json`，不是硬编码在 UI 中。
- 前端 TS 开启 `strict`、`noUnusedLocals`、`noUnusedParameters`；新增代码应保持这套约束可通过。
- Vite dev server 固定 `1420`，并显式忽略 `src-tauri/**` 的 watch。

## ANTI-PATTERNS (THIS PROJECT)
- 不要移除 `src-tauri/src/main.rs` 第 1 行的 Windows 注释/属性；它用于 release 下隐藏额外 console 窗口。
- 不要把生成产物当源码分析：`src-tauri/gen/schemas/*` 和 `src-tauri/target/*` 都是噪音，不应作为业务修改入口。
- 不要绕过 `resolve_install_dir` / `${INSTALL_DIR}` 注入规则，避免全局安装目录逻辑前后端不一致。
- 不要在前端手写与 Rust 脱节的类型；`src/types/index.ts` 需要与 `src-tauri/src/models/*.rs` 对齐。

## UNIQUE STYLES
- UI 文案以中文为主，但文件名、路由、事件名、命令名全部保持英文。
- `ToolStatus` 在前端使用带 `type`/`data` 的判别联合，在 Rust 使用 `#[serde(tag = "type", content = "data")]`；改动状态结构时两端必须同时更新。
- 安装日志采用 JSONL 持久化到 app data 目录，并同时 `emit` 给前端实时展示。
- `.cargo/config.toml` 明确锁定 Windows GNU 目标与 LLVM-MinGW/WinLibs 路径；构建问题优先检查这里。

## COMMANDS
```bash
npm run dev
npm run build
npm run preview
npm run tauri
```

## NOTES
- 当前仓库没有测试脚本；验证通常依赖 `npm run build` 与 Tauri 构建链路。
- README 很短，真正的设计上下文在 `docs/technical/*.md`。
- 现有技术文档比代码略超前，阅读设计时要以 `src/` 和 `src-tauri/` 实现为准。

# Olympus Hub

Olympus Hub 是一个基于 Tauri v2、React 18、TypeScript、Zustand 和 Rust 的桌面端 AI 工具管理器。它用于集中展示、检测、安装、启动和卸载本机 AI 工具，并通过配置文件驱动工具定义。

当前内置工具配置位于 `tools/codex.json`，已包含 OpenAI Codex CLI 的安装、启动、卸载和依赖检测信息。

## 功能清单

### 工具库

- 展示内置工具列表，包括名称、分类、描述和当前状态。
- 支持刷新工具列表。
- 支持按状态显示工具操作：安装、启动、卸载、运行中、处理中。
- 支持展示异常状态信息和运行进程 PID。
- 通过 Tauri 事件 `tool_status_changed` 实时同步工具状态。

### 安装向导

- 安装前自动执行环境检测。
- 展示系统信息：操作系统、CPU 架构、可用磁盘空间、网络连通性。
- 按工具配置检测依赖项，并展示当前版本、最低版本、检测结果和安装引导。
- 根据检测结果给出整体结论：环境就绪、存在风险项、存在阻塞项。
- 存在阻塞项时禁止继续安装。
- 安装过程中实时展示后端日志。
- 支持取消安装。
- 安装完成后展示成功或失败状态，并在失败时给出下一步建议。
- 支持失败后重新检测并重试安装。

### 工具生命周期管理

- 支持按工具配置执行安装命令。
- 支持安装后验证命令。
- 支持启动已安装工具，并记录运行进程 PID。
- 工具进程退出后自动恢复为已安装状态。
- 支持卸载工具。
- 支持安装目录占位符 `${INSTALL_DIR}` 注入。
- 支持持久化终态工具状态：已安装、未安装。

### 设置

- 支持配置统一安装目录。
- 支持配置开机自启。
- 支持通过系统目录选择器选择安装目录。
- 保存设置前会自动创建目录并验证写入权限。
- 支持清空安装目录，回退到工具或系统默认安装路径。
- 设置保存后通过 `settings_changed` 事件同步前端状态。
- 设置持久化到应用数据目录。

### 日志

- 环境检测、依赖检测、安装、安装后验证、启动和卸载流程都会写入结构化日志。
- 日志以 JSONL 格式持久化到应用数据目录。
- 前端通过 `log_appended` 事件实时接收日志。
- 安装页会读取最近安装日志，默认最多 500 条。
- 卸载时默认清理对应工具日志。

### 配置驱动能力

- 工具定义通过 `tools/*.json` 管理，当前以内嵌方式编译进 Tauri 后端。
- 工具配置包含：基础信息、依赖项、安装命令、卸载命令、启动命令、环境变量、安装后检测命令和安装目录覆盖项。
- 前端 IPC 类型集中在 `src/types/index.ts`，后端模型集中在 `src-tauri/src/models/`。

### 当前版本说明

- 当前版本**不实现**基于 Ollama 或其他大模型的 AI 安装助手。
- 当前版本**不支持**“输入官方文档/URL 自动生成工具安装配置”。
- 如需新增工具，请手动维护 `tools/*.json` 配置文件。

## 当前内置工具

### OpenAI Codex CLI

- 工具 ID：`codex`
- 来源：npm 包 `@openai/codex`
- 安装命令：`npm install -g @openai/codex`
- 卸载命令：`npm uninstall -g @openai/codex`
- 启动命令：`codex`
- 安装后验证：`codex --version`
- 必需依赖：Node.js 22.0.0+、npm 8.0.0+
- 可选依赖：Git 2.0.0+

## 页面结构

- `/`：工具库首页。
- `/install/:toolId`：工具安装向导。
- `/settings`：全局设置页。

## IPC 能力

前端通过 `src/api/tauri.ts` 统一调用 Tauri command：

- `get_tool_list`：获取工具列表和状态。
- `get_tool_status`：获取单个工具状态。
- `check_environment`：执行环境与依赖检测。
- `install_tool`：开始安装工具。
- `cancel_install`：取消安装。
- `launch_tool`：启动工具。
- `uninstall_tool`：卸载工具。
- `get_settings`：读取设置。
- `set_settings`：保存设置。
- `get_install_logs`：读取安装日志。

## 技术栈

- 桌面壳：Tauri v2
- 前端：React 18、TypeScript、React Router、Zustand
- 样式：Tailwind CSS
- 后端：Rust、Tokio
- 构建：Vite、Cargo

## 开发命令

安装依赖：

```bash
npm install
```

启动前端开发服务器：

```bash
npm run dev
```

启动桌面端开发模式：

```bash
npm run tauri dev
```

构建前端资源：

```bash
npm run build
```

构建桌面端安装包：

```bash
npm run tauri build
```

## 开发注意事项

- 新增工具优先新增或调整 `tools/*.json`，不要把工具定义硬编码进 UI。
- 新增 IPC command 时，需要同时更新 Rust command、`src-tauri/src/lib.rs` 的 `generate_handler!` 注册，以及 `src/api/tauri.ts`。
- 新增或修改后端实现时，必须同步新增或更新 Rust 测试；没有测试的后端改动不视为完成。
- 改动工具状态、日志、设置等 IPC payload 时，需要同步维护 Rust 模型和 `src/types/index.ts`。
- 当前 Windows 开发环境使用 `x86_64-pc-windows-gnu` 目标；`src-tauri/Cargo.toml` 的库类型保留 `rlib`，用于避免 GNU 链接阶段导出符号过多的问题。
- 当前仓库没有测试脚本，常用验证方式是 `npm run build` 和 `cargo check`。

## 当前限制

- 当前只内置 OpenAI Codex CLI 一个工具配置。
- 工具配置目前以内嵌方式编译进应用，尚未开放 UI 动态导入外部工具配置。
- 当前版本未集成 Ollama，也未提供 AI 自动生成工具配置能力。
- 工具状态只持久化终态，安装中、启动中、运行中等瞬态不会写入状态文件。
- 环境检测的网络连通性当前通过连接 `8.8.8.8:53` 判断，在部分代理或受限网络环境下可能需要调整。

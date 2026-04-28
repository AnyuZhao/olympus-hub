# 前后端 IPC 契约

本文档定义桌面端前端与 Tauri 后端之间的所有 Command、Event 与 Error 契约。前端 Store 与组件必须严格按此契约调用。

---

## 1. Command 目录

```text
src-tauri/src/commands/
├── tool.rs          # 工具列表、工具详情、基础状态
├── install.rs       # 安装计划生成、安装执行、取消、重试
├── lifecycle.rs     # 卸载、升级、启动、停止、自启
├── settings.rs      # 全局设置
├── log.rs           # 日志读取、日志摘要
└── model.rs         # 模型配置测试、模型调用状态
```

---

## 2. tool.rs — 工具列表与状态

### 2.1 `list_tools`

- **输入**：无
- **输出**：`Vec<ToolManifest>`
- **错误**：`AppError::CatalogLoadFailed`
- **说明**：加载内置与用户自定义工具配置，返回完整工具定义列表。

### 2.2 `get_tool`

- **输入**：`tool_id: String`
- **输出**：`ToolManifest`
- **错误**：`AppError::ToolNotFound`

### 2.3 `get_tool_state`

- **输入**：`tool_id: String`
- **输出**：`ToolRuntimeState`
- **错误**：`AppError::ToolNotFound`
- **说明**：返回工具当前组合状态（install + runtime + update）。

### 2.4 `save_tool_config`

- **输入**：`tool_id: String, config: ToolLevelSettings`
- **输出**：`()`
- **错误**：`AppError::ConfigSaveFailed`
- **说明**：保存工具级覆盖配置（安装目录、启动参数、自启等）。

---

## 3. install.rs — 安装流程

### 3.1 `generate_install_plan`

- **输入**：`tool_id: String`
- **输出**：`ExecutionPlan`
- **错误**：
  - `AppError::ToolNotFound`
  - `AppError::EnvironmentCheckFailed`
  - `AppError::PlanGenerationFailed`
- **事件流**：
  - `install:planning` — 开始生成计划
  - `install:plan_ready` — 计划生成完成，携带 `ExecutionPlan`
- **说明**：
  - 根据 `ToolManifest` 中的平台安装方式与 `ToolLevelSettings` 配置生成执行计划。
  - 若需模型参与，先调用 `model_client` 生成草案，再本地校验。

### 3.2 `start_install`

- **输入**：`tool_id: String, plan_id: String`
- **输出**：`()`
- **错误**：
  - `AppError::ToolNotFound`
  - `AppError::PlanNotFound`
  - `AppError::PlanValidationFailed`
  - `AppError::AlreadyInProgress`
- **事件流**：
  - `install:step_start` — 步骤开始 `{ step_id, stage, name }`
  - `install:step_output` — 步骤实时输出 `{ step_id, stdout_line?, stderr_line? }`
  - `install:step_complete` — 步骤完成 `{ step_id, success }`
  - `install:failed` — 安装失败 `{ step_id, error, hint? }`
  - `install:success` — 安装成功
- **说明**：异步执行，前端通过事件流观察进度。

### 3.3 `cancel_install`

- **输入**：`tool_id: String`
- **输出**：`()`
- **错误**：`AppError::NoActiveTask`
- **说明**：向执行器发送取消信号，已执行的步骤不自动回滚。

### 3.4 `retry_install`

- **输入**：`tool_id: String`
- **输出**：`()`
- **错误**：同 `start_install`
- **说明**：基于上一次失败的日志，可选触发模型诊断后生成修复计划，再重新执行。

---

## 4. lifecycle.rs — 生命周期操作

### 4.1 `uninstall_tool`

- **输入**：`tool_id: String`
- **输出**：`()`
- **错误**：
  - `AppError::ToolNotFound`
  - `AppError::NotInstalled`
  - `AppError::LifecycleBusy`
- **事件流**：`lifecycle:uninstall_start`, `lifecycle:uninstall_complete`, `lifecycle:uninstall_failed`
- **说明**：若工具处于运行态，应先停止再卸载。

### 4.2 `upgrade_tool`

- **输入**：`tool_id: String`
- **输出**：`()`
- **错误**：
  - `AppError::ToolNotFound`
  - `AppError::NotInstalled`
  - `AppError::NoUpdateAvailable`
  - `AppError::LifecycleBusy`
- **事件流**：`lifecycle:upgrade_start`, `lifecycle:upgrade_step_*`, `lifecycle:upgrade_complete`

### 4.3 `start_tool`

- **输入**：`tool_id: String`
- **输出**：`()`
- **错误**：
  - `AppError::ToolNotFound`
  - `AppError::NotInstalled`
  - `AppError::AlreadyRunning`
- **事件流**：`lifecycle:launch_start`, `lifecycle:launch_complete`, `lifecycle:launch_failed`

### 4.4 `stop_tool`

- **输入**：`tool_id: String`
- **输出**：`()`
- **错误**：
  - `AppError::ToolNotFound`
  - `AppError::NotRunning`

### 4.5 `check_for_update`

- **输入**：`tool_id: String`
- **输出**：`UpdateCheckResult`
- **错误**：`AppError::ToolNotFound`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| tool_id | string | 工具 ID |
| current_version | string \| null | 当前版本 |
| latest_version | string \| null | 最新版本 |
| update_available | boolean | 是否有更新 |
| changelog_url | string \| null | 更新日志 URL |

### 4.6 `set_tool_autostart`

- **输入**：`tool_id: String, config: AutostartConfig`
- **输出**：`()`
- **错误**：`AppError::ToolNotFound`

---

## 5. settings.rs — 全局设置

### 5.1 `get_settings`

- **输入**：无
- **输出**：`GlobalSettings`

### 5.2 `save_settings`

- **输入**：`settings: GlobalSettings`
- **输出**：`()`
- **错误**：`AppError::ConfigSaveFailed`
- **说明**：保存后触发 `settings:changed` 事件。

### 5.3 `test_model_connection`

- **输入**：`config: ExternalModelConfig`
- **输出**：`ModelHealthResult`
- **错误**：`AppError::ModelConnectionFailed`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| reachable | boolean | 是否可连接 |
| latency_ms | number | 延迟毫秒 |
| model_id_verified | boolean | 模型 ID 是否已验证 |
| error | string \| null | 错误信息 |

---

## 6. log.rs — 日志

### 6.1 `get_logs`

- **输入**：`tool_id: String, limit: number, offset: number`
- **输出**：`LogEntry[]`

### 6.2 `get_log_summary`

- **输入**：`tool_id: String, plan_id: String | null`
- **输出**：`LogSummary`
- **说明**：用于安装失败后快速生成诊断输入。

### 6.3 `clear_logs`

- **输入**：`tool_id: String`
- **输出**：`()`

---

## 7. model.rs — 模型状态

### 7.1 `get_model_status`

- **输入**：无
- **输出**：`ModelStatus`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| enabled | boolean | 是否启用 |
| config | ExternalModelConfig \| null | 模型配置 |
| health | ModelHealthResult \| null | 健康检查结果 |
| calls_today | number | 今日调用次数 |
| budget_remaining | number \| null | 剩余预算 |

---

## 8. 全局事件流（Tauri Events）

前端通过 `listen` 订阅以下事件：

| Event Name | Payload | 来源 |
|------------|---------|------|
| `tool:state_changed` | `{ tool_id, state: ToolRuntimeState }` | `tool_state` |
| `install:planning` | `{ tool_id }` | `orchestrator` |
| `install:plan_ready` | `{ tool_id, plan: ExecutionPlan }` | `orchestrator` |
| `install:step_start` | `{ tool_id, step_id, stage, name }` | `executor` |
| `install:step_output` | `{ tool_id, step_id, line, is_stderr }` | `executor` |
| `install:step_complete` | `{ tool_id, step_id, success }` | `executor` |
| `install:failed` | `{ tool_id, step_id, error, hint }` | `orchestrator` |
| `install:success` | `{ tool_id }` | `orchestrator` |
| `lifecycle:launch_start` | `{ tool_id }` | `executor` |
| `lifecycle:launch_complete` | `{ tool_id, pid }` | `executor` |
| `lifecycle:launch_failed` | `{ tool_id, error }` | `executor` |
| `settings:changed` | `{ settings: GlobalSettings }` | `settings` |
| `log:new_entry` | `{ tool_id, entry: LogEntry }` | `log_manager` |

---

## 9. Error 码定义

- `CatalogLoadFailed`
- `ToolNotFound`
- `ConfigSaveFailed`
- `EnvironmentCheckFailed`
- `PlanGenerationFailed`
- `PlanNotFound`
- `PlanValidationFailed`
- `AlreadyInProgress`
- `NoActiveTask`
- `NotInstalled`
- `NotRunning`
- `AlreadyRunning`
- `LifecycleBusy`
- `NoUpdateAvailable`
- `ModelConnectionFailed`
- `ModelBudgetExceeded`
- `CommandRejectedByPolicy`
- `Unknown`

Rust 侧使用 `thiserror` 定义，前端统一通过 `Result<T, { code, message }>` 处理。

---

## 10. 前端 Store 映射

| Store | 订阅的 Event | 调用的 Command |
|-------|-------------|----------------|
| `useToolStore` | `tool:state_changed` | `list_tools`, `get_tool`, `get_tool_state` |
| `useInstallStore` | `install:*` | `generate_install_plan`, `start_install`, `cancel_install`, `retry_install` |
| `useLifecycleStore` | `lifecycle:*` | `uninstall_tool`, `upgrade_tool`, `start_tool`, `stop_tool`, `check_for_update` |
| `useSettingsStore` | `settings:changed` | `get_settings`, `save_settings`, `test_model_connection` |
| `useModelStore` | — | `get_model_status` |
| `useLogStore` | `log:new_entry` | `get_logs`, `get_log_summary`, `clear_logs` |

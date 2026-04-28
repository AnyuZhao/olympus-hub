# 统一数据模型规范

本文档定义 Olympus Hub 前后端（Rust / TypeScript）共享的数据契约，作为 IPC、CLI 与状态管理的统一依据。

---

## 1. 工具定义模型

### 1.1 ToolManifest

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 工具唯一标识 |
| version | string | 推荐安装的默认版本（semver，如 `22.11.0`；或 `latest` 表示最新） |
| name | string | 工具名称 |
| description | string | 工具描述 |
| homepage_url | string / null | 主页地址 |
| install_docs_url | string / null | 安装文档地址 |
| detection | Detection | 检测工具是否已安装及版本 |
| platforms | PlatformManifest[] | 各平台的工具管理清单 |

### 1.2 Detection

| 字段 | 类型 | 说明 |
|------|------|------|
| check_command | string | 版本检测命令，如 `node --version` |
| version_regex | string | 版本提取正则，取第一个捕获组，如 `v(\d+\.\d+\.\d+)` |

### 1.3 DependencyRef

> DependencyRef 仅用于 `PackageMethod.requires`，表示某一安装方式所需的依赖。

| 字段 | 类型 | 说明 |
|------|------|------|
| tool_id | string | 依赖的工具 ID（指向另一个 ToolManifest） |
| min_version | string / null | 最低版本约束（semver） |

### 1.4 PlatformManifest

**PlatformManifest**

| 字段 | 类型 | 说明 |
|------|------|------|
| os | `"windows"` / `"macos"` / `"linux"` | 操作系统 |
| arch | string[] / null | 支持的架构（如 "x86_64" / "aarch64"），null 表示全部 |
| methods | PackageMethod[] | 该平台下的安装方式列表 |

**PackageMethod**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 安装方式标识，如 `"winget"` / `"brew"` / `"npm"` |
| label | string | 显示名称 |
| requires | DependencyRef[] | 该安装方式所需的安装依赖 |
| install_commands | string[] | 安装命令序列 |
| uninstall_commands | string[] | 卸载命令序列 |
| installed_check | string / null | 安装后验证命令，null 时跳过验证 |

## 2. 运行时状态模型（本地数据库）

> 运行时状态数据存储在本地 SQLite 数据库中，与工具定义（JSON 配置文件）分离。

### 2.1 tool_states

工具运行时状态主表，每个工具一行。

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| tool_id | TEXT | PK | 工具 ID，对应工具定义 |
| install_status | TEXT | NOT NULL, DEFAULT 'NotInstalled' | 安装状态 |
| runtime_status | TEXT | NOT NULL, DEFAULT 'Stopped' | 运行状态 |
| update_status | TEXT | NOT NULL, DEFAULT 'Unknown' | 更新状态 |
| active_version | TEXT | NULL | 当前激活版本 |
| active_plan_id | TEXT | NULL | 当前进行中的执行计划 ID，无操作时为 null |
| pid | INTEGER | NULL | 工具运行时进程 ID |

**install_status 取值**：`NotInstalled` / `Installing` / `Installed` / `Uninstalling` / `Error`

**runtime_status 取值**：`Stopped` / `Launching` / `Running` / `Exited` / `Error`

**update_status 取值**：`Unknown` / `Checking` / `UpToDate` / `UpdateAvailable` / `Updating` / `Error`

### 2.2 installed_versions

已安装版本记录，每个工具可有多行（支持多版本并行安装）。

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | 自增主键 |
| tool_id | TEXT | FK → tool_states, NOT NULL | 所属工具 |
| version | TEXT | NOT NULL | 版本号 |
| install_path | TEXT | NOT NULL | 安装路径 |
| installed_at | TEXT | NOT NULL | 安装时间（ISO 8601） |
| install_method_id | TEXT | NOT NULL | 安装方式（对应 PackageMethod.id） |
| platform_os | TEXT | NOT NULL | 安装时的操作系统 |

UNIQUE(tool_id, version) — 同一工具同一版本不重复。

### 2.3 resolved_dependencies

依赖快照，记录每个已安装版本解析出的实际依赖。

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | 自增主键 |
| installed_version_id | INTEGER | FK → installed_versions, NOT NULL | 关联的已安装版本 |
| dep_tool_id | TEXT | NOT NULL | 依赖工具 ID |
| dep_version | TEXT | NOT NULL | 依赖的实际版本 |

### 2.4 tool_errors

错误历史记录，查询最新一条即为当前错误。

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | 自增主键 |
| tool_id | TEXT | FK → tool_states, NOT NULL | 所属工具 |
| code | TEXT | NOT NULL | 机器可读错误码 |
| message | TEXT | NOT NULL | 用户可读摘要 |
| detail | TEXT | NULL | 技术详情 |
| timestamp_ms | INTEGER | NOT NULL | 时间戳（毫秒） |

---

## 3. 执行计划模型

### 3.1 ExecutionPlan

**ExecutionPlan**

| 字段 | 类型 | 说明 |
|------|------|------|
| plan_id | string | 计划标识 |
| tool_id | string | 工具标识 |
| risk_level | `"low"` / `"medium"` / `"high"` / `"critical"` | 风险等级 |
| human_review_required | boolean | 是否需要人工审核 |
| dependencies | PlanDependency[] | 依赖列表 |
| steps | CommandStep[] | 主操作步骤 |
| verification_steps | CommandStep[] | 验证步骤 |
| rollback_steps | CommandStep[] | 回滚步骤 |
| uninstall_steps | CommandStep[] | 卸载步骤 |

**PlanDependency**

| 字段 | 类型 | 说明 |
|------|------|------|
| tool_id | string | 依赖工具 ID |
| status | `"present"` / `"missing"` / `"version_mismatch"` | 依赖状态 |
| required_version | string / null | 所需版本 |
| actual_version | string / null | 实际版本 |

**CommandStep**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 步骤标识 |
| name | string | 步骤名称 |
| command | string | 执行命令 |
| stage | string | 阶段 |
| required | boolean | 是否必需 |
| timeout_seconds | number | 超时时间（秒） |

### 3.2 DiagnosisResult

**DiagnosisResult**

| 字段 | 类型 | 说明 |
|------|------|------|
| error_category | string | 错误分类 |
| root_cause_summary | string | 根本原因摘要 |
| confidence | `"low"` / `"medium"` / `"high"` | 置信度 |
| recommended_actions | RecommendedAction[] | 推荐操作 |
| can_retry_automatically | boolean | 是否可以自动重试 |
| retry_plan | ExecutionPlan / null | 重试计划 |
| user_visible_message | string | 面向用户的消息 |

**RecommendedAction**

| 字段 | 类型 | 说明 |
|------|------|------|
| type | `"retry"` / `"manual_fix"` / `"docs"` / `"ignore"` | 操作类型 |
| description | string | 描述 |
| command | string / null | 命令 |

---

## 4. 日志模型

### 4.1 LogEntry

| 字段 | 类型 | 说明 |
|------|------|------|
| timestamp_ms | number | 时间戳（毫秒） |
| tool_id | string | 工具标识 |
| plan_id | string / null | 计划标识 |
| level | `"debug"` / `"info"` / `"warn"` / `"error"` | 日志级别 |
| stage | string / null | 操作阶段（install / uninstall / update / diagnose） |
| message | string | 消息内容 |

### 4.2 LogSummary

| 字段 | 类型 | 说明 |
|------|------|------|
| tool_id | string | 工具标识 |
| plan_id | string / null | 计划标识 |
| total_entries | number | 总条目数 |
| error_count | number | 错误数 |
| warning_count | number | 警告数 |
| last_error | string / null | 最后一条错误 |
| excerpt | string | 受控长度的尾部摘要 |

---

## 5. 配置与设置模型

### 5.1 GlobalSettings

**GlobalSettings**

| 字段 | 类型 | 说明 |
|------|------|------|
| base_install_dir | string | 工具安装基础目录，路径约定为 {base_install_dir}/{tool_id}/{version}/ |
| autostart | boolean | 应用是否自启动 |
| log_retention_days | number | 日志保留天数 |
| external_model | ExternalModelConfig / null | 外部模型配置 |
| call_budget | BudgetConfig | 调用预算配置 |

**ExternalModelConfig**

| 字段 | 类型 | 说明 |
|------|------|------|
| provider | `"openai"` / `"claude"` / `"custom"` | 提供商 |
| api_base_url | string | API 基础地址 |
| api_key | string / null | API 密钥（运行时从安全存储读取，不序列化到明文配置） |
| model_id | string | 模型标识 |
| timeout_seconds | number | 超时时间（秒） |

**BudgetConfig**

| 字段 | 类型 | 说明 |
|------|------|------|
| enabled | boolean | 是否启用预算 |
| max_calls_per_task | number | 每个任务最大调用次数 |
| max_calls_per_day | number / null | 每天最大调用次数 |

### 5.2 ToolLevelSettings

**ToolLevelSettings**

| 字段 | 类型 | 说明 |
|------|------|------|
| tool_id | string | 工具标识 |
| install_dir_override | string / null | 安装目录覆盖 |
| launch_args | string[] | 启动参数 |
| env_vars | Record<string, string> | 运行时环境变量 |
| working_dir | string / null | 运行时工作目录 |
| launch_command | string / null | 启动命令 |
| autostart | boolean | 是否自启动 |
| autostart_scope | `"AppManaged"` / `"SystemLogin"` / null | 自启动范围：AppManaged 由应用托管启停，SystemLogin 注册为系统登录启动项 |
| autostart_delay_seconds | number / null | 延迟启动时间（秒） |
| restart_on_exit | boolean | 退出后是否重启 |
| auto_update_enabled | boolean | 是否启用自动更新 |
| auto_update_channel | string / null | 更新通道（stable / beta / nightly） |
| auto_update_interval_hours | number / null | 检查更新间隔（小时） |

---

## 6. Rust 侧对应结构

Rust 侧模型位于 `src-tauri/src/models/`，按以下文件组织：

```text
src-tauri/src/models/
├── mod.rs
├── tool_manifest.rs     # ToolManifest, Detection, PlatformManifest, PackageMethod, DependencyRef
├── runtime_state.rs     # 对应 SQLite 表结构的 Rust 模型
├── execution_plan.rs      # ExecutionPlan, CommandStep, PlanDependency, DiagnosisResult
├── log.rs               # LogEntry, LogSummary
├── settings.rs          # GlobalSettings, ToolLevelSettings, ExternalModelConfig, BudgetConfig
└── error.rs             # ToolError, AppError
```

### 同步规则

1. **Rust 模型变更必须同步前端类型**。IPC payload 在两侧必须字段一致。
2. 新增后端模型必须有 `serde` 序列化/反序列化测试。
3. 前端类型按领域拆分至 `src/types/`：
   ```text
   src/types/
   ├── tool.ts
   ├── execution-plan.ts
   ├── log.ts
   ├── settings.ts
   └── index.ts
   ```
4. 枚举类型在 Rust 侧使用 `#[serde(rename_all = "PascalCase")]` 或 `"camelCase"`，确保与 TS 侧命名一致。

---

## 7. 版本兼容性

- 工具配置 JSON 增加 `schema_version` 字段，当前为 `1`。
- 加载旧版配置时，`schema_version` 缺失按 `0` 处理，向后兼容。
- 新增字段必须为 `Option<T>`，禁止破坏性修改现有必填字段。

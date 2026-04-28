# 后端模块拆分指南

## 概述

Olympus Hub 后端基于 Tauri（Rust），按职责拆分为以下模块。模块间通过明确的输入/输出接口协作，遵循单一职责原则。各模块按定义层、决策层、执行层、观察层组织，架构分层详见 system-overview.md。

数据分层：
- **工具定义层**：JSON 配置文件（`tools/*.json`），定义工具元信息、检测方式、平台安装方式
- **运行时状态层**：本地 SQLite 数据库，存储安装记录、运行状态、错误历史

## 模块总览

| 模块 | 所属层 | 职责 | 输入 | 输出 |
|------|--------|------|------|------|
| tool_registry | 定义层 | 加载和索引工具定义 | tools/*.json | Vec<ToolManifest> |
| tool_state | 定义层 | 运行时状态 CRUD | SQLite 数据库 | ToolRuntimeState |
| environment | 决策层 | 系统环境检测 | 操作系统 API | EnvInfo（os, arch, 已安装工具） |
| dependency_resolver | 决策层 | DAG 依赖解析与路径选择 | ToolManifest + EnvInfo | ResolvedPath |
| planner | 决策层 | 执行计划生成 | ResolvedPath | ExecutionPlan |
| model_client | 决策层 | AI 模型集成 | 诊断上下文 | 诊断建议 / 修复方案 |
| policy | 决策层 | 安全与权限策略 | 命令内容 | 允许 / 拒绝 |
| executor | 执行层 | 执行计划命令 | ExecutionPlan | ExecutionResult |
| updater | 执行层 | 版本检查与更新 | Detection + 远程源 | 更新可用性 |
| autostart | 执行层 | 自启动管理 | ToolManifest + 系统 API | 自启配置状态 |
| log_manager | 观察层 | 日志记录与聚合 | 各模块日志 | LogEntry / LogSummary |

## 模块详情

### 1. tool_registry

**职责**：加载 `tools/` 目录下所有 JSON 工具定义文件，解析为 `ToolManifest` 结构，提供按 ID 查询和全量列表。

**核心接口**：
- `load_all() → Vec<ToolManifest>` — 加载所有工具定义
- `get_by_id(tool_id) → Option<ToolManifest>` — 按 ID 查询

**输入**：`tools/*.json` 文件（符合 ToolManifest 模型）
**输出**：`ToolManifest`（含 detection、platforms）

**依赖模块**：无

---

### 2. tool_state

**职责**：管理 SQLite 数据库中的运行时状态，提供 4 张表的 CRUD 操作。

**核心接口**：
- `get_state(tool_id) → ToolRuntimeState` — 查询工具运行时状态
- `update_status(tool_id, install_status, runtime_status, update_status)` — 更新状态
- `add_installed_version(tool_id, InstalledVersion)` — 记录新安装版本
- `remove_installed_version(tool_id, version)` — 移除已安装版本记录
- `set_active_version(tool_id, version)` — 设置激活版本
- `log_error(tool_id, ToolError)` — 记录错误
- `get_latest_error(tool_id) → Option<ToolError>` — 获取最新错误

**数据库表**：`tool_states`、`installed_versions`、`resolved_dependencies`、`tool_errors`

**依赖模块**：无

---

### 3. environment

**职责**：检测当前系统环境信息，包括操作系统、架构、已安装工具及其版本。

**核心接口**：
- `detect_os() → String` — 检测操作系统（windows/macos/linux）
- `detect_arch() → String` — 检测架构（x86_64/aarch64）
- `check_tool_installed(Detection) → Option<String>` — 执行检测命令，返回已安装版本或 None
- `get_env_info() → EnvInfo` — 综合环境信息

**依赖模块**：tool_registry（获取 Detection 配置）

---

### 4. dependency_resolver

**职责**：解析工具安装方式中的 DAG 依赖关系，结合当前环境选择最优安装路径。

**核心能力**：
- 从 `PackageMethod.requires` 构建依赖 DAG
- 检测哪些依赖已满足（通过 environment 模块）
- 检测依赖图中的环路（循环依赖），发现时报错并给出涉及的工具链路（如 `A → B → C → A`）
- **自动模式**：对每个平台可用的 PackageMethod，计算缺失依赖数量，优选最少的
- **手动模式**：列出所有可用路径及其依赖状态，由用户选择
- 拓扑排序生成安装顺序

**核心接口**：
- `resolve_auto(tool_id, EnvInfo) → ResolvedPath` — 自动选择最优安装路径
- `resolve_manual(tool_id, EnvInfo) → Vec<CandidatePath>` — 列出所有候选路径
- `select_path(CandidatePath) → ResolvedPath` — 用户选定路径

**输入**：ToolManifest（platforms + methods + requires）、EnvInfo
**输出**：ResolvedPath（选定的 PackageMethod + 拓扑排序后的安装顺序）；若检测到循环依赖则返回 `CyclicDependencyError`（含环路链路信息）

**依赖模块**：tool_registry、environment

---

### 5. planner

**职责**：将解析后的安装路径转换为具体的执行计划，包含命令序列、风险评估和确认提示。

**核心接口**：
- `create_plan(ResolvedPath) → ExecutionPlan` — 生成安装计划
- `create_uninstall_plan(tool_id, version) → ExecutionPlan` — 生成卸载计划
- `create_upgrade_plan(tool_id, target_version) → ExecutionPlan` — 生成升级计划

**输入**：ResolvedPath（含 PackageMethod 的 install_commands/uninstall_commands）
**输出**：ExecutionPlan（对应 data-models.md 第 3 节）

**依赖模块**：dependency_resolver、tool_state（查询当前安装状态）

---

### 6. executor

**职责**：执行计划中的命令序列，管理进程生命周期，报告执行结果。

**核心接口**：
- `execute_plan(ExecutionPlan) → ExecutionResult` — 执行安装计划
- `cancel_execution(plan_id)` — 取消执行中的计划

**执行流程**：
1. 逐步执行 ExecutionPlan 中的命令
2. 每步执行后检查退出码
3. 执行 `installed_check` 验证安装结果
4. 成功后通知 tool_state 记录 InstalledVersion

**依赖模块**：tool_state（更新状态）、policy（命令审核）、log_manager（记录日志）

---

### 7. model_client

**职责**：与外部 AI 模型交互，提供智能诊断和修复建议。

**核心接口**：
- `diagnose_failure(tool_id, ToolError, context) → DiagnosisResult` — 诊断安装失败原因
- `suggest_repair(tool_id, DiagnosisResult) → RepairSuggestion` — 生成修复建议

**输入**：错误信息、环境上下文、安装日志
**输出**：诊断结果、修复建议

**依赖模块**：tool_state（获取错误历史）、log_manager（获取日志上下文）

---

### 8. policy

**职责**：对即将执行的命令进行安全审核，确保不执行危险操作。

**核心接口**：
- `check_commands(commands: Vec<String>) → PolicyResult` — 审核命令安全性
- `check_permission(action) → bool` — 检查操作权限

**依赖模块**：无

---

### 9. log_manager

**职责**：统一日志记录、聚合和查询。

**核心接口**：
- `log(tool_id, level, message, detail)` — 记录日志
- `get_logs(tool_id, filter) → Vec<LogEntry>` — 查询日志
- `get_summary(tool_id) → LogSummary` — 获取日志摘要

**数据模型**：对应 data-models.md 第 4 节 LogEntry / LogSummary

**依赖模块**：无

---

### 10. autostart

**职责**：管理工具的系统自启动配置。

**核心接口**：
- `register(tool_id, launch_command, args)` — 注册自启动
- `unregister(tool_id)` — 取消自启动
- `is_registered(tool_id) → bool` — 查询自启状态

**依赖模块**：tool_registry

---

### 11. updater

**职责**：检查工具版本更新并执行升级。

**核心接口**：
- `check_update(tool_id) → Option<AvailableUpdate>` — 检查可用更新
- `apply_update(tool_id, target_version) → ExecutionPlan` — 生成升级计划

**依赖模块**：tool_registry、environment、planner

## 模块依赖关系

```
┌─────────────── 定义层 ───────────────┐
│ tool_registry ──→ tool_state         │
└──────────────────────────────────────┘
         │
         ▼
┌─────────────── 决策层 ───────────────┐
│ environment ──→ dependency_resolver  │
│                        │             │
│                        ▼             │
│ model_client ──→ planner             │
│ policy                               │
└──────────────────────────────────────┘
         │
         ▼
┌─────────────── 执行层 ───────────────┐
│ executor ──→ tool_state（更新状态）   │
│ updater ──→ planner（生成升级计划）   │
│ autostart ──→ tool_registry          │
└──────────────────────────────────────┘
         │
         ▼
┌─────────────── 观察层 ───────────────┐
│ log_manager ──→ 决策层（诊断输入）   │
└──────────────────────────────────────┘

跨层调用规则：
- 定义层 ← 被所有层读取
- 决策层 → 向执行层输出计划
- 执行层 → 向观察层输出日志事件
- 执行层 → 向定义层更新状态
- 观察层 → 向决策层提供诊断输入（日志摘要）
- policy → executor（命令审核，决策层 → 执行层）
```

## Rust 模块文件结构

```
src-tauri/src/
├── modules/
│   ├── tool_registry.rs
│   ├── tool_state.rs
│   ├── environment.rs
│   ├── dependency_resolver.rs
│   ├── planner.rs
│   ├── executor.rs
│   ├── model_client.rs
│   ├── policy.rs
│   ├── log_manager.rs
│   ├── autostart.rs
│   └── updater.rs
├── models/
│   ├── tool_manifest.rs
│   ├── runtime_state.rs
│   ├── execution_plan.rs
│   ├── log.rs
│   ├── settings.rs
│   └── error.rs
└── db/
    ├── mod.rs
    └── migrations/
```

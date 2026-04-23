# Olympus Hub 拆分模块实施文档

> 状态说明：本文档描述的是**后续规划**，不是当前版本已落地模块。
> 当前版本未实现外部模型驱动安装、AI 安装助手或自动生成工具配置能力。

## 1. 目的

本文档把已有三份设计文档落到工程模块拆分层面：

- `docs/external-model-install-requirements.md`
- `docs/core-capabilities.md`
- `docs/tool-lifecycle-and-management.md`

目标是明确后续实现外部模型驱动安装、工具生命周期管理、自动更新和开机自启时，代码应拆成哪些模块、各模块职责是什么、按什么顺序落地，以及哪些测试必须同步补齐。

---

## 2. 总体分层

后续代码建议按四层拆分：

```text
定义层 Definition
  ↓
决策层 Decision
  ↓
执行层 Execution
  ↓
观察层 Observation
```

### 2.1 定义层

负责描述“工具是什么”和“可用上下文是什么”。

包含：

- 工具元信息
- 官网与安装文档
- 依赖定义
- 工具级设置
- 生命周期状态模型

### 2.2 决策层

负责回答“现在应该怎么安装、升级、修复”。

包含：

- 外部模型客户端
- 安装计划生成
- 故障诊断
- 计划校验
- 调用预算控制

### 2.3 执行层

负责执行已经通过校验的计划。

包含：

- 安装命令执行
- 升级命令执行
- 卸载命令执行
- 启动命令执行
- 取消与重试

### 2.4 观察层

负责记录、展示、摘要和回放“发生了什么”。

包含：

- 日志写入
- 日志读取
- 日志摘要
- 状态事件
- 安装过程 UI 展示

---

## 3. 后端目标模块拆分

当前后端集中在 `src-tauri/src/core/`，后续建议拆成以下模块。

### 3.1 `tool_catalog`

建议文件：

- `src-tauri/src/core/tool_catalog.rs`

职责：

- 加载内置工具配置
- 加载用户自定义工具配置
- 后续支持远程/产品侧工具配置
- 保存工具配置
- 校验工具定义完整性

迁移来源：

- 当前 `config_manager.rs`

后续输出：

- `Vec<ToolDefinition>`
- `ToolDefinition`
- `ToolDocumentSource`

必须测试：

- 能加载内置工具
- 能加载自定义工具
- 非 JSON 文件会跳过
- 损坏 JSON 不会中断整体加载
- 保存工具后可重新加载

---

### 3.2 `tool_state`

建议文件：

- `src-tauri/src/core/tool_state.rs`

职责：

- 管理工具安装态、运行态、更新态
- 持久化终态
- 提供状态流转 API
- 防止非法状态跳转

迁移来源：

- 当前 `AppState.tool_states`
- 当前 `ToolStatus`

目标模型：

```rust
pub struct ToolRuntimeState {
    pub install_status: InstallStatus,
    pub runtime_status: RuntimeStatus,
    pub update_status: UpdateStatus,
    pub last_error: Option<ToolError>,
    pub active_plan_id: Option<String>,
    pub pid: Option<u32>,
}
```

必须测试：

- 默认状态为未安装且未运行
- 终态可持久化
- 瞬态不应直接持久化为最终状态
- 非法状态跳转会被拒绝或降级处理

---

### 3.3 `environment`

建议文件：

- `src-tauri/src/core/environment.rs`

职责：

- 收集 OS、架构、磁盘、网络
- 检查 PATH、权限、代理等上下文
- 生成给模型和执行器使用的环境上下文

迁移来源：

- 当前 `env_validator.rs`
- 当前 `dependency_detector.rs` 的一部分

必须测试：

- 依赖检测解析版本
- 版本比较逻辑
- 无法解析版本时返回 `CheckFailed`
- 必需依赖缺失时整体状态为阻塞

---

### 3.4 `dependency`

建议文件：

- `src-tauri/src/core/dependency.rs`

职责：

- 依赖定义解析
- 本地依赖检测
- 依赖修复建议生成

迁移来源：

- 当前 `dependency_detector.rs`

必须测试：

- semver 比较
- 正则解析
- required / optional 依赖差异

---

### 3.5 `plan`

建议文件：

- `src-tauri/src/core/plan.rs`

职责：

- 定义安装计划、升级计划、修复计划
- 将模型输出转为内部计划
- 对计划做 schema 与业务校验
- 生成可执行命令队列

核心类型：

```rust
pub struct InstallPlan {
    pub plan_id: String,
    pub tool_id: String,
    pub risk_level: RiskLevel,
    pub human_review_required: bool,
    pub install_steps: Vec<CommandStep>,
    pub verification_steps: Vec<CommandStep>,
    pub rollback_steps: Vec<CommandStep>,
}
```

必须测试：

- 缺少必填字段会拒绝
- 高风险命令会拒绝
- 需要确认的计划不会直接进入执行
- 安装命令可正确转换为执行步骤

---

### 3.6 `policy`

建议文件：

- `src-tauri/src/core/policy.rs`

职责：

- 命令安全策略
- 来源可信策略
- 模型调用预算策略
- 自动更新策略
- 自动重试策略

必须测试：

- 高风险命令识别
- 预算耗尽后拒绝继续调用模型
- 大版本更新默认需要用户确认
- 未知来源默认高风险

---

### 3.7 `model_client`

建议文件：

- `src-tauri/src/core/model_client.rs`

职责：

- 封装外部模型 API
- 支持 OpenAI-compatible API
- 后续可扩展 Claude / 其他模型提供方
- 统一结构化输出解析
- 统一错误映射

替换来源：

- 当前 `ai_assistant.rs` 中 Ollama 相关逻辑

核心能力：

- `generate_install_plan`
- `diagnose_failure`
- `generate_repair_plan`

必须测试：

- 请求体生成正确
- 非 2xx 响应映射为模型服务错误
- 非结构化响应会被拒绝
- JSON schema 解析失败会返回明确错误

---

### 3.8 `orchestrator`

建议文件：

- `src-tauri/src/core/orchestrator.rs`

职责：

- 编排完整安装流程
- 连接环境检测、模型计划、计划校验、执行器和日志系统
- 控制 React 式重试轮次
- 控制模型调用预算

核心流程：

```text
check_environment
  -> generate_plan
  -> validate_plan
  -> execute_plan
  -> if failed: summarize_logs
  -> diagnose_failure
  -> optional repair_plan
```

必须测试：

- 正常安装路径只调用一次计划生成
- 计划校验失败不会执行命令
- 安装失败后会触发诊断
- 超过重试次数后停止自动迭代

---

### 3.9 `executor`

建议文件：

- `src-tauri/src/core/executor.rs`

职责：

- 执行通过校验的命令步骤
- 采集 stdout / stderr
- 支持取消
- 记录每个步骤结果

迁移来源：

- 当前 `tool_manager.rs` 的命令执行部分

必须测试：

- `${INSTALL_DIR}` 注入
- 取消标记生效
- 命令失败返回失败步骤
- stdout / stderr 可被收集为日志事件

---

### 3.10 `log_summary`

建议文件：

- `src-tauri/src/core/log_summary.rs`

职责：

- 从 JSONL 日志中提取错误片段
- 生成模型诊断所需摘要
- 控制日志输入长度

依赖：

- 当前 `log_manager.rs`

必须测试：

- 只取最近 N 条日志
- 优先提取 Error / Warn
- 日志摘要不超过限制长度
- 空日志返回明确占位摘要

---

### 3.11 `autostart`

建议文件：

- `src-tauri/src/core/autostart.rs`

职责：

- 管理应用级开机自启
- 后续管理工具级开机自启
- 支持 `AppManaged` 自启模式

迁移来源：

- 当前设置页中的 autostart 插件调用

必须测试：

- 工具级自启配置解析
- AppManaged 模式会生成待启动工具列表
- 禁用自启后不会拉起工具

---

### 3.12 `updater`

建议文件：

- `src-tauri/src/core/updater.rs`

职责：

- 检查工具版本
- 判断是否可升级
- 触发升级计划生成
- 协调升级执行

必须测试：

- 本地版本低于远程版本时返回 `UpdateAvailable`
- 补丁版本可按策略自动升级
- 大版本升级需要确认
- 检查失败时不破坏已安装状态

---

## 4. 后端 commands 拆分

当前：

- `commands/tool.rs`
- `commands/settings.rs`
- `commands/log.rs`
- `commands/assistant.rs`

目标建议：

```text
commands/
├── tool.rs          # 工具列表、工具详情、基础状态
├── install.rs       # 安装计划生成、安装执行、取消、重试
├── lifecycle.rs     # 卸载、升级、启动、停止、自启
├── settings.rs      # 全局设置
├── log.rs           # 日志读取、日志摘要
└── model.rs         # 模型配置测试、模型调用状态
```

拆分原则：

- command 层只做参数处理和权限入口
- 业务逻辑全部下沉到 `core/`
- command 不直接拼命令、不直接读写复杂状态

---

## 5. 前端模块拆分

### 5.1 页面层

目标页面：

```text
src/pages/
├── ToolListPage.tsx          # 工具列表
├── ToolDetailPage.tsx        # 工具详情、文档来源、配置摘要
├── InstallWizardPage.tsx     # 安装流程
├── LifecyclePage.tsx         # 升级、自启、运行管理，可后续拆
├── SettingsPage.tsx          # 全局设置
└── ModelSettingsPage.tsx     # 外部模型配置，可并入 Settings 第一版
```

### 5.2 store 层

目标 store：

```text
src/stores/
├── useToolStore.ts           # 工具列表和基础状态
├── useInstallStore.ts        # 安装计划、安装步骤、安装结果
├── useLifecycleStore.ts      # 运行、自启、升级状态
├── useModelStore.ts          # 模型配置、调用预算、模型健康状态
└── useSettingsStore.ts       # 全局设置
```

### 5.3 组件层

建议组件：

```text
src/components/
├── ToolCard.tsx
├── StatusBadge.tsx
├── InstallPlanPreview.tsx
├── RiskBadge.tsx
├── LogViewer.tsx
├── DiagnosisPanel.tsx
├── UpdatePanel.tsx
└── AutostartToggle.tsx
```

---

## 6. 类型模型拆分

当前前端类型集中在：

- `src/types/index.ts`

短期可以继续保留，但建议按领域拆分：

```text
src/types/
├── tool.ts
├── lifecycle.ts
├── install-plan.ts
├── model.ts
├── log.ts
├── settings.ts
└── index.ts
```

Rust 侧建议对应：

```text
src-tauri/src/models/
├── tool.rs
├── lifecycle.rs
├── install_plan.rs
├── model.rs
├── diagnosis.rs
├── settings.rs
└── log_entry.rs
```

同步规则：

- Rust 模型变更必须同步前端类型
- IPC payload 必须在两侧保持字段一致
- 新增后端模型必须有序列化/反序列化测试

---

## 7. 实施阶段拆分

### Phase 0：清理当前概念债务

目标：先把现有 Ollama 方向收束为“旧实验能力”，避免和前期“配置编排优先”路线混淆。

任务：

- 标记当前 `ai_assistant.rs` 为待替换
- 将 `ollama_endpoint` / `ollama_model` 从长期目标中移除
- 文档层明确前期默认走配置编排，外部模型为后续增强能力

验收：

- README 或技术文档不再把 Ollama 作为默认主路线
- 新需求文档与模块文档方向一致
- 前期实施顺序与 `docs/config-orchestration-first-plan.md` 一致

---

### Phase 1：定义层重构

目标：把工具配置扩展为可承载官网链接、安装文档、生命周期配置和编排流程的定义层模型。

后端任务：

- 新增 `ToolDefinition`
- 新增 `ToolDocumentSource`
- 新增 `ToolLifecycleConfig`
- 新增 `ToolUpdateConfig`
- 新增 `ToolAutostartConfig`
- 新增 `ToolOrchestrationConfig`

前端任务：

- 工具列表展示文档来源与管理能力摘要
- 工具详情页展示官方链接、安装文档摘要、自动更新、自启状态

测试要求：

- Rust：工具配置加载、默认值、缺失字段兼容
- TS：工具卡片/详情页展示逻辑

---

### Phase 2：生命周期状态扩展

目标：补齐短期状态语义，同时保留现有 `ToolStatus` 兼容。

后端任务：

- 增加 `Checking`
- 增加 `Planning`
- 增加 `NeedsReview`
- 增加 `Uninstalling`
- 增加 `Upgrading`
- 增加 `Diagnosing`
- 增加 `Repairing`

前端任务：

- 更新 `StatusBadge`
- 更新 `ToolCard` 操作按钮策略
- 安装页支持 `Planning` 和 `NeedsReview`

测试要求：

- Rust：状态持久化策略和状态切换
- TS：状态标签、按钮可用性、安装页状态展示

---

### Phase 3：配置编排执行器

目标：先用配置描述安装/卸载/升级/修复流程，不依赖外部模型。

后端任务：

- 新增 `orchestration.rs`
- 新增 `executor.rs`
- 新增 `policy.rs`
- 支持步骤流解析
- 支持条件判断与步骤级失败提示
- 支持计划校验

前端任务：

- 安装页展示步骤流和阶段进度
- 工具详情页展示编排摘要
- 高风险配置步骤进入用户确认

测试要求：

- Rust：步骤流解析、执行条件、计划校验、安全策略
- TS：步骤预览、风险展示、安装页阶段切换

---

### Phase 4：配置驱动升级与修复

目标：支持基于配置的升级、修复和失败建议，不依赖模型即时生成。

后端任务：

- 新增 `updater.rs`
- 支持 `upgrade` flow
- 支持 `repair` flow
- 支持步骤级失败建议和日志摘要

前端任务：

- 工具卡展示 `UpdateAvailable`
- 安装失败后展示配置建议
- 支持手动升级与修复入口

测试要求：

- Rust：升级策略、repair flow、失败收口
- TS：升级按钮、修复入口、失败建议展示

---

### Phase 5：工具级开机自启

目标：支持配置驱动的工具级开机自启。

后端任务：

- 新增 `autostart.rs`
- 支持 `AppManaged` 模式
- 应用启动后根据配置拉起工具
- 自启失败写日志

前端任务：

- 工具详情页增加自启开关
- 自启失败展示日志与建议

测试要求：

- Rust：自启配置解析、待启动列表生成、禁用策略
- TS：自启开关、状态展示

---

### Phase 6：日志摘要与失败建议

目标：不依赖模型，也能根据配置和日志给出失败建议。

后端任务：

- 新增 `log_summary.rs`
- 支持错误片段提取
- 支持配置化失败建议匹配
- 支持统一失败摘要输出

前端任务：

- 安装页展示失败摘要
- 展示配置化建议与文档链接

测试要求：

- Rust：日志摘要、失败建议匹配、错误片段提取
- TS：失败建议展示、链接跳转

---

### Phase 7：外部模型增强层

目标：在配置编排底座稳定后，再引入外部模型作为增强能力。

后端任务：

- 新增 `model_client.rs`
- 新增结构化计划 schema
- 支持模型生成配置草案、升级草案、修复建议
- 所有模型输出必须写回配置层或计划层再执行

前端任务：

- 设置页增加外部模型配置
- 安装页展示“模型建议”与“配置结果”的差异

测试要求：

- Rust：模型请求构造、响应解析、计划校验
- TS：模型配置表单、建议展示

---

### Phase 8：预算与审计

目标：在引入外部模型增强层后，控制调用成本并沉淀审计记录。

后端任务：

- 新增 `budget.rs`
- 新增模型调用审计日志
- 支持单任务调用上限
- 支持全局调用上限

前端任务：

- 安装页展示剩余调用次数或超限提示
- 设置页展示预算策略

测试要求：

- Rust：预算扣减、超限拒绝、审计记录
- TS：超限提示与禁用状态

---

## 8. 迁移优先级

建议优先级如下：

1. Phase 1：定义层重构
2. Phase 2：生命周期状态扩展
3. Phase 3：外部模型客户端与计划 schema
4. Phase 4：安装编排重构
5. Phase 5：日志摘要与故障诊断
6. Phase 8：预算与审计
7. Phase 6：自动更新
8. Phase 7：工具级开机自启

原因：

- 定义层和状态层是所有后续能力的基础
- 外部模型和安装编排是核心业务闭环
- 预算和审计应在模型调用上线前完成
- 自动更新和工具级自启可以在主安装闭环稳定后再做

---

## 9. 测试策略

项目约束：**后端实现必须有测试**。

因此每个后端模块落地时必须同步补测试。

### 9.1 Rust 测试

必须覆盖：

- 配置加载与默认值
- 状态流转
- 模型响应解析
- 安装计划校验
- 命令安全策略
- 日志摘要
- 预算控制
- 自动更新策略
- 工具级自启策略

### 9.2 前端测试

必须覆盖：

- 状态标签展示
- 按钮可用性
- 安装步骤切换
- 计划预览
- 诊断建议展示
- 设置表单
- 自动更新与自启开关

### 9.3 验证命令

当前建议保留：

```bash
npm test
npm run build
cargo check
cargo test --lib --no-run
```

等 Windows GNU 测试运行环境修复后，再将 `cargo test` 加入强制验证。

---

## 10. 风险与控制点

### 10.1 不要让模型绕过执行层

模型只能生成计划，不能直接执行命令。

### 10.2 不要让生命周期状态无限膨胀

状态扩展要围绕安装态、运行态、更新态三个维度，不要继续堆到单一 enum。

### 10.3 不要把工具配置变成模型专属结构

工具定义层必须保持模型无关，模型只是生成或补充计划。

### 10.4 不要忽略调用预算

外部模型上线前必须先有调用预算控制，否则 React 式重试容易失控。

---

## 11. 推荐下一步

下一步建议先做 Phase 1 和 Phase 2 的详细设计与实现：

1. 定义新的 Rust / TS 数据模型草案
2. 扩展工具配置字段
3. 补齐生命周期状态
4. 更新状态展示和按钮策略
5. 补齐对应 Rust 与前端单元测试

完成后再进入外部模型客户端与安装计划 schema 的实现。

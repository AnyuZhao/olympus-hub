# 前端模块指南

本文档定义桌面端前端代码的模块拆分规范，与后端模块实施计划的前端章节互补。

---

## 1. 目录结构

```text
src/
├── api/
│   └── tauri.ts              # 统一 IPC 调用层，消费 ipc-contract.md
├── types/
│   ├── tool.ts               # ToolManifest
│   ├── lifecycle.ts          # InstallStatus, RuntimeStatus, UpdateStatus
│   ├── execution-plan.ts      # ExecutionPlan, CommandStep, DiagnosisResult
│   ├── model.ts              # ExternalModelConfig, ModelStatus, ModelHealthResult
│   ├── log.ts                # LogEntry, LogSummary
│   ├── settings.ts           # GlobalSettings, BudgetConfig
│   └── index.ts              # 统一导出
├── stores/
│   ├── useToolStore.ts       # 工具列表与基础状态
│   ├── useInstallStore.ts    # 安装计划、安装步骤、安装结果
│   ├── useLifecycleStore.ts  # 运行、自启、升级状态
│   ├── useModelStore.ts      # 模型配置、调用预算、模型健康状态
│   ├── useSettingsStore.ts   # 全局设置
│   └── useLogStore.ts        # 日志读取与实时跟踪
├── pages/
│   ├── ToolListPage.tsx      # 工具列表（dashboard/list 模板）
│   ├── ToolDetailPage.tsx    # 工具详情、文档来源、配置摘要
│   ├── InstallWizardPage.tsx # 安装流程（wizard/install 模板）
│   ├── LifecyclePage.tsx     # 升级、自启、运行管理
│   ├── SettingsPage.tsx      # 全局设置（settings/form 模板）
│   └── ModelSettingsPage.tsx # 外部模型配置（可并入 SettingsPage 第一版）
└── components/
    ├── Layout.tsx            # 固定侧边栏 + 主内容区桌面结构
    ├── ToolCard.tsx          # 一级信息容器：标题、状态、摘要、主动作
    ├── StatusBadge.tsx       # 统一状态颜色与标签映射
    ├── ExecutionPlanPreview.tsx# 执行计划预览面板
    ├── RiskBadge.tsx         # 风险等级标识
    ├── LogViewer.tsx         # 长任务反馈专门区域
    ├── DiagnosisPanel.tsx    # 失败诊断与建议展示
    ├── UpdatePanel.tsx       # 更新可用提示与升级入口
    ├── AutostartToggle.tsx   # 工具级自启开关
    ├── PreCheckPanel.tsx     # 环境检测结果展示
    └── ui/                   # 通用 UI 基元（按钮、输入框、卡片等）
        ├── Button.tsx
        ├── Input.tsx
        ├── Switch.tsx
        ├── Select.tsx
        └── Card.tsx
```

---

## 2. Store 层规范

### 2.1 每个 Store 的职责边界

| Store | 管理状态 | 订阅 Event | 调用 Command |
|-------|---------|-----------|-------------|
| `useToolStore` | 工具列表、当前工具定义、工具状态快照 | `tool:state_changed` | `list_tools`, `get_tool`, `get_tool_state` |
| `useInstallStore` | 当前安装计划、步骤进度、安装结果、失败信息 | `install:*` | `generate_install_plan`, `start_install`, `cancel_install`, `retry_install` |
| `useLifecycleStore` | 运行 PID、升级状态、自启配置 | `lifecycle:*` | `uninstall_tool`, `upgrade_tool`, `start_tool`, `stop_tool`, `check_for_update`, `set_tool_autostart` |
| `useSettingsStore` | 全局设置表单状态、保存反馈 | `settings:changed` | `get_settings`, `save_settings`, `test_model_connection` |
| `useModelStore` | 模型连接状态、预算消耗、诊断结果 | — | `get_model_status` |
| `useLogStore` | 日志列表、实时跟踪状态、摘要 | `log:new_entry` | `get_logs`, `get_log_summary`, `clear_logs` |

### 2.2 Store 实现约束

1. **单一职责**：每个 Store 只管理一个领域的客户端状态，禁止跨领域直接修改。
2. **IPC 隔离**：所有 Tauri Command 调用必须集中在 `api/tauri.ts`，Store 只通过该文件发起调用。
3. **事件清理**：组件卸载时必须取消 Event 监听，避免内存泄漏。
4. **乐观更新**：UI 交互（如按钮点击）可乐观更新本地状态，但必须以 IPC 返回结果为准做最终确认。
5. **错误统一处理**：Store 中的 IPC 错误统一转换为 `{ code, message }` 结构，供 UI 层消费。

---

## 3. 页面层规范

### 3.1 页面模板对应

| 页面 | 模板类型 | 来源规范 |
|------|---------|----------|
| ToolListPage | dashboard/list | ui-design-spec.md |
| ToolDetailPage | detail/log-heavy（轻量版） | ui-design-spec.md |
| InstallWizardPage | wizard/install | ui-design-spec.md |
| LifecyclePage | settings/form（混合） | ui-design-spec.md |
| SettingsPage | settings/form | ui-design-spec.md |

### 3.2 页面实现约束

1. **模板先行**：新增页面必须先归类到 ui-design-spec.md 定义的模板类型，再决定布局。
2. **状态来自 Store**：页面组件不直接调用 IPC，只从对应 Store 读取状态和触发 Action。
3. **加载态统一**：每个页面必须处理 `loading`、`empty`、`error` 三种基础状态。
4. **单主操作**：每个页面主任务区只允许一个 page-level primary action。

---

## 4. 组件层规范

### 4.1 组件分级

| 级别 | 职责 | 示例 |
|------|------|------|
| 基元组件 (Primitive) | 无业务逻辑，纯视觉表达 | `Button`, `Input`, `Switch`, `Card` |
| 复合组件 (Composite) | 组合基元，承担特定业务表达 | `StatusBadge`, `RiskBadge`, `AutostartToggle` |
| 页面组件 (Page-level) | 组合复合组件，实现完整页面 | `ToolListPage`, `InstallWizardPage` |
| 布局组件 (Layout) | 提供页面骨架 | `Layout` |

### 4.2 关键组件约束

#### ToolCard
- 一级信息：工具名称、StatusBadge、primary CTA
- 二级信息：分类、描述摘要、PID（运行态）、错误摘要（异常态）
- 禁止：承载完整依赖详情、并列多个主按钮、默认暴露技术细节

#### StatusBadge
- 统一颜色映射，禁止同一状态在不同页面使用冲突语义色
- 禁止做成可点击主操作

#### LogViewer
- 独立滚动区域，支持 `follow` 模式
- 禁止成为页面第一视觉焦点
- 禁止替代状态结论或主动作说明

#### ExecutionPlanPreview
- 展示步骤列表、风险等级、确认按钮
- 高风险计划必须显式展示 `human_review_required` 提示

---

## 5. 类型层规范

### 5.1 拆分规则

- `tool.ts`：工具定义相关
- `lifecycle.ts`：状态枚举与运行时状态
- `execution-plan.ts`：执行计划、诊断结果
- `model.ts`：模型配置与健康状态
- `log.ts`：日志实体与摘要
- `settings.ts`：全局设置与预算

### 5.2 同步规则

1. Rust 模型变更后，前端类型必须在同一次提交中同步更新。
2. IPC payload 字段名必须与 Rust 侧 `#[serde(rename)]` 声明一致。
3. 新增枚举值必须在 `StatusBadge` 组件中补充颜色映射，否则视为未定义行为。

---

## 6. API 层规范

### 6.1 `src/api/tauri.ts`

该文件是前端与后端唯一的 IPC 边界：

- `listTools(): Promise<ToolManifest[]>` — 调用 `invoke("list_tools")`
- `startInstall(toolId: string, planId: string): Promise<void>` — 调用 `invoke("start_install", { toolId, planId })`
- `listenInstallEvents(handler: InstallEventHandler): () => void` — 订阅安装相关事件，返回取消监听函数

### 6.2 约束

1. 禁止在组件或 Store 之外直接调用 `@tauri-apps/api` 的 `invoke` 或 `listen`。
2. 所有 Command 调用必须包装为命名函数，附带类型签名。
3. Event 监听必须返回取消函数，由调用方在 `useEffect` 清理中执行。

---

## 7. 与 UI 设计规范的衔接

所有前端实现必须以 `ui-design-spec.md` 为验收依据：

- **Token 架构**：颜色、排版、间距必须映射到 Tailwind config 的 theme 扩展，禁止散落硬编码值。
- **页面模板**：新增页面必须显式定义 `layout / hierarchy / actions / feedback / states / desktop constraints`。
- **状态矩阵**：`loading / success / warning / error / empty / disabled / busy / destructive` 的反馈形式必须与设计规范一致。
- **可访问性**：键盘可达性、focus 可见性、对比度、缩放适配为必须项。

---

## 8. 测试要求

| 层级 | 必须覆盖 |
|------|---------|
| Store | 状态变更逻辑、IPC 调用参数、错误处理路径 |
| 页面 | 加载态/空态/错误态渲染、主操作流程、状态切换 |
| 组件 | 状态标签展示、按钮可用性、空状态渲染 |

验证命令：

```bash
npm test
npm run build
```

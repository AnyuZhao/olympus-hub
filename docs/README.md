# Olympus Hub 文档总览

本文档中心按角色和模块组织，覆盖系统架构、桌面端、CLI、后端模块与模型集成方案。

---

## 快速导航

| 读者角色 | 推荐阅读 |
|----------|----------|
| 前端开发者 | [桌面端 UI 设计规范](desktop/ui-design-spec.md) → [前端模块指南](desktop/frontend-module-guide.md) → [前后端 IPC 契约](desktop/ipc-contract.md) |
| 后端 / Rust 开发者 | [系统架构总览](architecture/system-overview.md) → [统一数据模型规范](architecture/data-models.md) → [后端模块拆分指南](architecture/backend-modules.md) |
| CLI 开发者 | [CLI 设计规范](cli/cli-design-spec.md) → [CLI 命令参考](cli/cli-commands-reference.md) → [CLI 与桌面端能力对齐矩阵](cli/cli-desktop-parity.md) |
| 架构师 / 维护者 | [系统架构总览](architecture/system-overview.md) → [统一数据模型规范](architecture/data-models.md) → [实施路线图与验收清单](roadmap/phase-checklist.md) |
| 模型集成开发者 | [模型集成实施计划](integration/model-integration-plan.md) |

---

## 文档目录

### architecture — 架构层

- **[system-overview.md](architecture/system-overview.md)** — 系统架构总览（四层架构 + 七大能力域）
- **[data-models.md](architecture/data-models.md)** — 统一数据模型规范（Rust / TS 共享契约）
- **[backend-modules.md](architecture/backend-modules.md)** — 后端模块拆分指南（12 个模块职责与测试）

### desktop — 桌面端

- **[ui-design-spec.md](desktop/ui-design-spec.md)** — 桌面端 UI 设计规范（Token、组件、页面模板、状态矩阵）
- **[frontend-module-guide.md](desktop/frontend-module-guide.md)** — 前端模块指南（页面、组件、Store、类型拆分）
- **[ipc-contract.md](desktop/ipc-contract.md)** — 前后端 IPC 契约（Command、Event、Error 码）

### cli — 命令行

- **[cli-design-spec.md](cli/cli-design-spec.md)** — CLI 设计规范（定位、交互风格、错误码、配置读取）
- **[cli-commands-reference.md](cli/cli-commands-reference.md)** — CLI 命令参考（完整命令清单与示例）
- **[cli-desktop-parity.md](cli/cli-desktop-parity.md)** — CLI 与桌面端能力对齐矩阵

### integration — 集成

- **[model-integration-plan.md](integration/model-integration-plan.md)** — 模型集成实施计划（含安全边界与风险）

### roadmap — 路线图

- **[phase-checklist.md](roadmap/phase-checklist.md)** — 实施路线图与验收清单

---

## 核心原则速查

1. **配置先行**：所有安装 / 升级 / 卸载 / 修复 / 自启优先由配置描述，而非模型实时生成。
2. **模型后置**：大模型仅作为增强层，负责生成配置草案或诊断建议，不直接进入执行层。
3. **本地受控执行**：执行器只运行经过本地校验的步骤流，不接受自由文本命令。
4. **页内反馈优先**：桌面端采用 inline 为主、toast 为辅、modal 仅用于确认的反馈策略。
5. **单主操作**：任何卡片或页面主任务区只允许一个 primary CTA。

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-04-23 | 重构文档目录，新增 architecture / desktop / cli / integration / migration 子目录及配套文档 |
| 2026-04-24 | 重组文档目录，将 UI 设计规范并入 desktop 目录，移除 migration 空目录，统一文档索引与导航 |

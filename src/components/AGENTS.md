# FRONTEND COMPONENTS KNOWLEDGE BASE

## OVERVIEW
`src/components/` 放复用 UI 组件，当前覆盖导航布局、工具卡片、状态角标、环境预检结果和安装日志展示。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 应用壳与导航 | `Layout.tsx` | 左侧固定导航，主区域用 `Outlet` 承载页面 |
| 工具操作卡片 | `ToolCard.tsx` | 安装跳转、启动 invoke、卸载确认、状态派生按钮 |
| 工具状态标签 | `StatusBadge.tsx` | `ToolStatus["type"]` 到中文标签和颜色的映射 |
| 环境检测展示 | `PreCheckPanel.tsx` | 系统环境、依赖列表、overall banner |
| 安装日志窗口 | `LogViewer.tsx` | 自动滚动到底部，按 `LogLevel` / `InstallStage` 映射展示 |

## CONVENTIONS
- 组件只接收已成型的数据；拉取数据、监听事件、路由参数处理放在 `pages/`。
- 按状态派生 UI 时先判断 `status.type`，再读取 `data`。
- 视觉风格沿用深色底、`surface-card` 容器、`accent` 主操作色、低透明边框。
- 日志/状态/依赖的枚举映射集中放在组件顶部常量，不要散在 JSX 分支里。
- UI 文案用中文，状态 key、stage key、level key 保持与 `src/types/index.ts` 一致。

## ANTI-PATTERNS
- 不要在展示组件里调用 `listen` 或直接订阅全局事件。
- 不要在组件里硬编码新的 command 名；操作统一经 `api/tauri.ts`。
- 不要把 `ToolStatus` 的 `data` 读取写成无保护访问；Rust 端的 tagged enum 会按状态变体变化。
- 不要把 Tailwind 主题色换成孤立 hex；共享色在 `tailwind.config.js`。

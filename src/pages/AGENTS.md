# FRONTEND PAGES KNOWLEDGE BASE

## OVERVIEW
`src/pages/` 是路由级编排层：负责读取 store、调用 `api`、监听 Tauri events，并把数据传给 components 展示。

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 工具库首页 | `ToolListPage.tsx` | 首次加载工具列表，监听 `tool_status_changed` |
| 安装向导 | `InstallWizardPage.tsx` | `checkEnvironment` → `installTool` → 事件驱动完成态 |
| 设置页 | `SettingsPage.tsx` | 目录选择、保存设置、监听 `settings_changed` |

## CONVENTIONS
- 页面 mounted 后发起数据加载；cleanup 中注销所有 `listen` 返回的 unlistener。
- 页面负责“流程编排”，组件负责“纯展示/局部交互”。
- 安装页使用 `toolId` 路由参数作为事件过滤条件，避免不同工具的日志串线。
- `InstallWizardPage` 的 step 来自 `useInstallStore`，不要在局部 `useState` 里复制流程状态。
- 设置页通过 `@tauri-apps/plugin-dialog` 的 `open({ directory: true })` 选择目录，不走自定义文件选择器。

## ANTI-PATTERNS
- 不要在 effect 依赖缺失时引入闭包错误；如果新增 store 方法或 props，要重新审视依赖数组。
- 不要在页面里手写与 Rust 不一致的 payload 类型；统一从 `src/types/index.ts` import。
- 不要让安装页接受未过滤事件；所有 `log_appended` / `install_complete` / `tool_status_changed` 都要按 `tool_id` 判断。
- 不要把后端错误吞掉后仍显示成功态；安装失败必须进入 `setDone(false, error)`。

# FRONTEND KNOWLEDGE BASE

## OVERVIEW
`src/` 承载单页桌面前端：React Router 路由、Zustand 状态、Tauri invoke 包装，以及展示安装/设置/工具列表的 UI。

## STRUCTURE
```text
src/
├── api/         # Tauri invoke 封装
├── components/  # 复用 UI 组件
├── pages/       # 路由页面
├── stores/      # Zustand 状态
├── types/       # 与 Rust 对齐的共享类型
├── App.tsx      # 路由树
└── main.tsx     # React 挂载入口
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 新增/调整页面路由 | `App.tsx` | 所有页面入口都在这里注册 |
| 工具列表交互 | `pages/ToolListPage.tsx`, `components/ToolCard.tsx` | 刷新、安装、启动、卸载按钮都从这里走 |
| 安装向导 | `pages/InstallWizardPage.tsx`, `components/PreCheckPanel.tsx`, `components/LogViewer.tsx` | 三段式流程：检测 / 安装 / 完成 |
| 设置页 | `pages/SettingsPage.tsx` | 浏览目录、保存全局安装目录 |
| Tauri IPC | `api/tauri.ts` | 统一调用面，不要在页面里直接 `invoke` |
| 状态模型 | `stores/*.ts`, `types/index.ts` | store 状态与 payload 类型的真实来源 |

## CONVENTIONS
- 页面监听 Tauri events，store 保存数据；不要把 `listen(...)` 分散塞进普通展示组件。
- `api` 对象是前端唯一 IPC 边界；新命令先加 `api/tauri.ts`，再让页面/store 调用。
- 页面文案与交互提示用中文，事件名与类型字段保持英文。
- `ToolStatus` 用判别联合，读取 `Running` / `Error` 附带数据时先检查 `status.type`。
- 当前样式全部走 Tailwind utility class；主题色来自 `tailwind.config.js` 的 `surface` / `accent` 扩展色。

## ANTI-PATTERNS
- 不要直接修改 `tools` 数组中的对象引用；统一通过 Zustand 的 `set` 更新。
- 不要在多个文件重复声明 IPC payload 类型；统一使用 `types/index.ts`。
- 不要在非页面层发起无清理的事件监听；现有模式都是 `listen(...).then(fn => fn())` 在 effect cleanup 中注销。
- 不要跳过 `api/tauri.ts` 直接在页面写 command 名字符串，这会让 IPC 契约失去集中维护点。

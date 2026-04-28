# CLI 设计规范

本文档定义 Olympus Hub CLI 的定位、交互风格、输出格式、错误处理与配置读取方式。

---

## 1. CLI 定位

### 1.1 目标用户
- 高级用户与开发者
- 需要自动化、脚本化操作的场景
- 无法或不希望启动桌面 GUI 的环境（SSH、CI、容器）

### 1.2 与桌面端的关系
```text
桌面端（GUI）        CLI（命令行）
   ↓                    ↓
  共用同一套 Rust core/ 模块
   ↓                    ↓
  Tauri IPC           直接函数调用
   ↓                    ↓
  React 前端          stdout/stderr
```

- CLI **复用** `core/` 全部四层能力（定义、决策、执行、观察）
- CLI **不依赖**前端构建产物、不启动 Web 视图
- CLI 与桌面端共享同一份配置文件与工具配置目录

---

## 2. 命令风格

### 2.1 命名规范
- 采用 `hub <noun> <verb>` 或 `hub <verb>` 风格，保持一致性
- 命令与参数使用 kebab-case
- 支持 `-h/--help`、`-v/--version` 全局选项

### 2.2 全局选项

| 选项 | 说明 |
|------|------|
| `-h, --help` | 显示帮助 |
| `-v, --version` | 显示版本 |
| `--json` | 以 JSON 格式输出所有结果 |
| `--config <path>` | 指定配置文件路径 |
| `--verbose` | 输出调试级别日志 |
| `--no-color` | 禁用彩色输出 |

### 2.3 输出模式

#### TTY 模式（交互式终端）
- 使用表格、进度条、颜色、 spinner
- 长任务显示实时进度与日志尾部

#### 非 TTY 模式（管道 / 脚本）
- 默认输出纯文本或 `--json` 机器可读格式
- 不显示 spinner、进度条等动态内容
- 日志输出到 stderr，结果输出到 stdout

---

## 3. 错误处理

### 3.1 退出码

| 退出码 | 含义 |
|--------|------|
| `0` | 成功 |
| `1` | 通用错误 |
| `2` | 工具不存在 |
| `3` | 环境不满足（依赖缺失、OS/Arch 不支持） |
| `4` | 执行失败（命令返回非零、安装失败） |
| `5` | 计划校验失败（高风险命令被拦截） |
| `6` | 模型服务不可用或预算耗尽 |
| `7` | 配置错误 |
| `130` | 用户中断（Ctrl+C） |

### 3.2 错误输出格式

```text
Error: <人类可读摘要>
  Code: <错误码>
  Detail: <技术详情>
  Suggestion: <建议操作>
```

使用 `--json` 时：

```json
{
  "success": false,
  "error": {
    "code": "PlanValidationFailed",
    "message": "安装计划包含被策略拦截的高风险命令",
    "detail": "Command 'curl | sh' is blocked by policy",
    "suggestion": "请检查工具配置或使用 --force 跳过策略（不推荐）"
  }
}
```

---

## 4. 配置读取

### 4.1 配置来源（按优先级从高到低）

1. 命令行参数（`--config`）
2. 环境变量（`OLYMPUS_HUB_CONFIG`）
3. 用户级配置文件
   - Windows: `%APPDATA%\com.olympus-hub\config.json`
   - macOS: `~/Library/Application Support/com.olympus-hub/config.json`
   - Linux: `~/.config/com.olympus-hub/config.json`

### 4.2 与桌面端共享的配置项
- `default_install_dir`
- `log_retention_days`
- `external_model`（CLI 同样可调用模型诊断）
- 工具级覆盖配置

### 4.3 CLI 专属配置项
- `output_format`: `"auto" | "text" | "json"`
- `interactive`: `boolean` — 是否允许交互式确认

---

## 5. 日志与输出

### 5.1 日志级别
- `--verbose` 启用 `debug` 级别
- 默认 `info` 级别
- `--quiet` 只输出 `warn` 及以上

### 5.2 输出分流
- **stdout**：命令结果、结构化数据、`--json` 输出
- **stderr**：日志、进度信息、人机交互提示

### 5.3 长任务输出
安装、升级等长任务默认显示：
- 当前步骤名称与阶段
- 步骤进度（如 3/7）
- 最后几条日志输出（类似 `tail -f`）
- 使用 `--json` 时每条日志为独立 JSON Lines

---

## 6. 交互式确认

### 6.1 需要确认的场景
- 高风险操作（卸载、覆盖安装、执行被策略标记的命令）
- 大版本升级
- 模型调用预算即将耗尽

### 6.2 非交互模式
- `--yes` / `-y` 自动确认所有提示
- `--dry-run` 只展示计划，不执行
- 非 TTY 环境下默认不交互，除非显式提供 `--yes`

---

## 7. 与后端模块的调用关系

```text
CLI 命令入口
  ├── tool_registry.rs     # list, show
  ├── planner.rs           # install, upgrade, repair
  ├── executor.rs          # start, stop
  ├── tool_state.rs        # status
  ├── log_manager.rs       # logs
  ├── settings.rs          # config
  └── model_client.rs      # diagnose
```

CLI 不经过 `commands/` Tauri Command 层，直接调用 `core/` 模块函数。

---

## 8. 开发约束

1. 所有新 CLI 命令必须在本文档中先登记，再实现。
2. 每个命令必须有 `--help` 输出、至少一个使用示例、退出码说明。
3. 所有涉及工具变更的命令必须有 `--dry-run` 支持。
4. CLI 与桌面端的状态变更必须触发相同事件，确保状态同步。

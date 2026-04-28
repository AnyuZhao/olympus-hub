# CLI 命令参考

Olympus Hub CLI 完整命令清单。

---

## 全局选项

```text
hub [OPTIONS] <COMMAND>

Options:
  -h, --help          打印帮助信息
  -v, --version       打印版本信息
  --json              以 JSON 格式输出结果
  --config <PATH>     指定配置文件路径
  --verbose           启用调试日志
  --no-color          禁用彩色输出
```

---

## hub list — 工具列表

```text
hub list [OPTIONS]

Options:
  --category <CAT>    按分类筛选
  --status <STATUS>   按安装状态筛选
  --json              以 JSON 输出
```

### 示例

```bash
# 列出所有工具
hub list

# 按分类筛选
hub list --category "AI Model"

# JSON 输出
hub list --json
```

### 输出示例

```text
NAME         CATEGORY      STATUS       VERSION
ollama       AI Model      Installed    0.3.0
codex-cli    CLI Tool      NotInstalled  —
comfyui      AI UI         Running      0.2.1
```

---

## hub show — 工具详情

```text
hub show <TOOL_ID> [OPTIONS]

Options:
  --json              以 JSON 输出完整定义
```

### 示例

```bash
hub show ollama
hub show ollama --json
```

---

## hub install — 安装工具

```text
hub install <TOOL_ID> [OPTIONS]

Options:
  --dry-run           只生成并展示计划，不执行
  --yes, -y           自动确认所有提示
  --no-model          禁用模型参与，纯配置编排
```

### 示例

```bash
# 标准安装
hub install ollama

# 预演安装
hub install ollama --dry-run

# 非交互安装
hub install ollama --yes
```

### 输出示例

```text
Generating install plan for ollama...
Plan ready (risk: low, 4 steps):
  [1/4] EnvCheck: Check OS and architecture
  [2/4] DepCheck: Verify Docker availability
  [3/4] Install: Run official install script
  [4/4] PostInstall: Verify ollama --version

Proceed? [Y/n] y

[1/4] EnvCheck ✓
[2/4] DepCheck ✓
[3/4] Install ...
  > Downloading...
  > Installing...
[3/4] Install ✓
[4/4] PostInstall ✓

ollama installed successfully.
```

---

## hub uninstall — 卸载工具

```text
hub uninstall <TOOL_ID> [OPTIONS]

Options:
  --yes, -y           跳过确认
  --purge             同时删除配置与日志
```

### 示例

```bash
hub uninstall ollama
hub uninstall ollama --yes --purge
```

---

## hub upgrade — 升级工具

```text
hub upgrade <TOOL_ID> [OPTIONS]

Options:
  --check-only        只检查更新，不执行升级
  --yes, -y           自动确认
```

### 示例

```bash
hub upgrade ollama --check-only
hub upgrade ollama
```

---

## hub start — 启动工具

```text
hub start <TOOL_ID> [OPTIONS]

Options:
  --detach            后台运行（默认）
  --foreground        前台运行，输出日志到当前终端
```

### 示例

```bash
hub start ollama
hub start ollama --foreground
```

---

## hub stop — 停止工具

```text
hub stop <TOOL_ID>
```

### 示例

```bash
hub stop ollama
```

---

## hub status — 查看状态

```text
hub status [TOOL_ID] [OPTIONS]

Options:
  --json              以 JSON 输出
  --watch             持续监视状态变化
```

### 示例

```bash
hub status
hub status ollama
hub status ollama --watch
```

---

## hub logs — 查看日志

```text
hub logs <TOOL_ID> [OPTIONS]

Options:
  --tail <N>          显示最后 N 条（默认 100）
  --follow, -f        实时跟踪新日志
  --json              以 JSON Lines 输出
  --level <LEVEL>     筛选级别：debug/info/warn/error
```

### 示例

```bash
hub logs ollama --tail 50
hub logs ollama --follow
hub logs ollama --level error --json
```

---

## hub doctor — 环境诊断

```text
hub doctor [TOOL_ID] [OPTIONS]

Options:
  --fix               尝试自动修复发现的问题
  --json              以 JSON 输出诊断结果
```

### 示例

```bash
hub doctor              # 全局诊断
hub doctor ollama       # 针对单个工具诊断
hub doctor ollama --fix # 诊断并尝试修复
```

### 输出示例

```text
Checking environment...

✓ OS: Windows 11 (supported)
✓ Arch: x86_64
✓ Disk: 120 GB available (min: 10 GB)
✓ Docker: 24.0.7 installed
! Node.js: 18.0.0 installed, but >= 20.0.0 recommended
✗ Python: not found (required)

Suggestion: Install Python 3.11 from https://python.org
```

---

## hub config — 配置管理

```text
hub config <SUBCOMMAND>

Subcommands:
  get <KEY>           读取配置项
  set <KEY> <VALUE>   设置配置项
  list                列出所有配置
  path                显示配置文件路径
```

### 示例

```bash
hub config list
hub config get default_install_dir
hub config set default_install_dir "D:\\Tools"
```

---

## hub model — 模型管理

```text
hub model <SUBCOMMAND>

Subcommands:
  status              查看模型连接状态与预算
  test                测试模型连接
  diagnose <TOOL_ID>  手动触发失败诊断（需有失败日志）
```

### 示例

```bash
hub model status
hub model test
hub model diagnose ollama
```

---

## hub repair — 修复工具

```text
hub repair <TOOL_ID> [OPTIONS]

Options:
  --yes, -y           自动确认
  --dry-run           只展示修复计划
```

### 示例

```bash
hub repair ollama
hub repair ollama --dry-run
```

---

## 命令速查表

| 命令 | 用途 | 是否长任务 |
|------|------|------------|
| `hub list` | 列出工具 | 否 |
| `hub show` | 工具详情 | 否 |
| `hub install` | 安装工具 | **是** |
| `hub uninstall` | 卸载工具 | **是** |
| `hub upgrade` | 升级工具 | **是** |
| `hub start` | 启动工具 | 否 |
| `hub stop` | 停止工具 | 否 |
| `hub status` | 查看状态 | 否 |
| `hub logs` | 查看日志 | 可选（--follow） |
| `hub doctor` | 环境诊断 | 否 |
| `hub config` | 配置管理 | 否 |
| `hub model` | 模型管理 | 否 |
| `hub repair` | 修复工具 | **是** |

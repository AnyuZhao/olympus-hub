# 工具生命周期与管理能力设计

## 1. 目的

本文档用于明确 Olympus Hub 中“工具生命周期管理”的目标形态。这里的生命周期不仅包含工具状态，还包含围绕工具运行所需的长期管理能力，例如自动更新、开机自启、配置持久化、日志诊断和外部模型参与后的修复流程。

当前代码中已有基础状态：

- `NotInstalled`
- `Installing`
- `Installed`
- `Launching`
- `Running`
- `Error`

后续要支持外部模型驱动安装、失败诊断、升级、卸载、自动更新和开机自启，因此需要把“状态”和“管理能力”拆清楚。

---

## 2. 生命周期管理的边界

工具生命周期管理不只是一个 `status` 字段，而是一组能力集合：

1. 安装状态管理
2. 运行状态管理
3. 升级与自动更新管理
4. 卸载与清理管理
5. 开机自启管理
6. 配置与偏好管理
7. 日志与故障恢复管理
8. 外部模型参与后的计划、诊断与修复管理

其中“状态管理”只是生命周期管理的其中一层。

---

## 3. 状态模型建议：拆分安装态与运行态

当前 `ToolStatus` 把安装态和运行态放在一个枚举里。短期可继续沿用，但目标形态建议拆成两个维度。

### 3.1 安装生命周期状态

安装生命周期描述工具本体是否存在、是否正在变更、是否需要人工介入。

建议状态：

- `NotInstalled`：未安装
- `Checking`：正在检测环境、依赖或版本
- `Planning`：正在生成安装/升级/修复计划，通常由外部模型参与
- `NeedsReview`：计划已生成，但需要用户确认
- `Installing`：正在安装
- `Installed`：已安装
- `Uninstalling`：正在卸载
- `Upgrading`：正在升级
- `UpdateAvailable`：已安装，但检测到新版本
- `Diagnosing`：正在分析失败日志或异常状态
- `Repairing`：正在执行修复计划
- `Cancelled`：用户取消了当前任务
- `Error`：生命周期任务失败

### 3.2 运行生命周期状态

运行生命周期描述工具进程或服务是否正在运行。

建议状态：

- `Stopped`：未运行
- `Launching`：启动中
- `Running`：运行中，可携带 `pid`
- `Exited`：已退出
- `LaunchError`：启动失败

### 3.3 为什么要拆分

拆分后可以避免语义冲突：

- 工具可以同时是 `Installed` + `Running`
- 工具可以是 `UpdateAvailable` + `Running`
- 工具可以安装成功但启动失败，即 `Installed` + `LaunchError`
- 升级前可以先要求停止运行态，而不是覆盖安装态

---

## 4. 推荐状态流转

### 4.1 首次安装

```text
NotInstalled
  -> Checking
  -> Planning
  -> NeedsReview
  -> Installing
  -> Installed
```

### 4.2 安装失败后的 React 式恢复

```text
Installing
  -> Error
  -> Diagnosing
  -> NeedsReview
  -> Repairing
  -> Installed
```

### 4.3 卸载

```text
Installed
  -> Uninstalling
  -> NotInstalled
```

### 4.4 升级

```text
Installed
  -> Checking
  -> UpdateAvailable
  -> Planning
  -> NeedsReview
  -> Upgrading
  -> Installed
```

### 4.5 启动与退出

```text
Stopped
  -> Launching
  -> Running
  -> Exited
```

---

## 5. 自动更新能力

### 5.1 能力定义

自动更新指系统可以周期性或手动检查工具是否有新版本，并在符合策略时提示用户或自动执行升级。

### 5.2 配置项建议

工具级配置建议增加：

- `auto_update_enabled`：是否启用自动更新
- `update_channel`：更新通道，如 `stable`、`beta`、`nightly`
- `version_check_command`：本地版本检查命令
- `remote_version_source`：远端版本来源
- `update_strategy`：更新策略
  - `ManualOnly`：只提示，不自动升级
  - `AskBeforeUpdate`：升级前确认
  - `AutoUpdateSafePatch`：仅自动安装补丁版本
- `last_update_check_ms`：上次检查时间
- `last_known_version`：最近识别到的版本

### 5.3 状态配合

自动更新需要使用以下状态：

- `Checking`
- `UpdateAvailable`
- `Planning`
- `NeedsReview`
- `Upgrading`
- `Error`

### 5.4 安全要求

- 自动更新不应默认执行高风险命令
- 大版本升级应要求用户确认
- 外部模型生成的升级计划必须经过本地校验
- 更新失败后应保留旧版本状态与日志

---

## 6. 开机自启能力

### 6.1 能力定义

开机自启分为两类：

1. Olympus Hub 应用自身开机自启
2. 某个被管理工具开机自启

当前已经接入的是第一类：应用自身开机自启。

未来如需支持第二类，需要将自启能力下沉到工具级配置。

### 6.2 工具级自启配置建议

建议增加：

- `autostart_enabled`：该工具是否随系统登录启动
- `autostart_scope`：自启范围
  - `AppManaged`：由 Olympus Hub 启动后拉起工具
  - `SystemLogin`：注册到系统登录项
- `autostart_args`：自启参数
- `autostart_env_vars`：自启环境变量
- `autostart_delay_seconds`：延迟启动时间
- `restart_on_exit`：异常退出后是否重启

### 6.3 推荐策略

短期建议采用 `AppManaged`：

```text
系统登录 -> Olympus Hub 自启 -> Olympus Hub 根据工具配置拉起指定工具
```

这样比每个工具都直接写系统登录项更可控，也更容易统一管理日志、状态和失败恢复。

### 6.4 状态配合

工具级自启涉及运行态：

- `Stopped`
- `Launching`
- `Running`
- `LaunchError`

如果自启失败，可进入安装态的 `Diagnosing`，由模型或本地规则分析启动日志。

---

## 7. 配置与偏好管理能力

### 7.1 当前能力

当前已有全局设置：

- 统一安装目录
- 应用开机自启
- AI 模型相关配置

### 7.2 未来建议拆分

建议将配置分成两层：

#### 全局设置

- 默认安装目录
- 应用开机自启
- 外部模型提供方配置
- 模型调用预算
- 日志保留策略

#### 工具设置

- 工具安装目录覆盖
- 工具级自动更新
- 工具级开机自启
- 工具级启动参数
- 工具级环境变量
- 工具级模型策略

---

## 8. 外部模型参与后的生命周期扩展

外部模型引入后，生命周期中会出现新的阶段：

- `Planning`：模型生成安装、升级或修复计划
- `NeedsReview`：计划需要用户确认
- `Diagnosing`：模型分析日志或错误
- `Repairing`：执行模型生成的修复计划

模型不得直接改变工具最终状态。模型只能输出结构化计划或诊断建议，最终状态仍由本地执行器根据真实执行结果设置。

---

## 9. 数据模型建议

目标形态可以从单一 `ToolStatus` 逐步演进为：

```ts
interface ToolRuntimeState {
  install_status: InstallStatus;
  runtime_status: RuntimeStatus;
  update_status: UpdateStatus;
  last_error: ToolError | null;
  active_plan_id: string | null;
  pid: number | null;
}
```

其中：

```ts
type InstallStatus =
  | "NotInstalled"
  | "Checking"
  | "Planning"
  | "NeedsReview"
  | "Installing"
  | "Installed"
  | "Uninstalling"
  | "Upgrading"
  | "Diagnosing"
  | "Repairing"
  | "Cancelled"
  | "Error";

type RuntimeStatus =
  | "Stopped"
  | "Launching"
  | "Running"
  | "Exited"
  | "LaunchError";

type UpdateStatus =
  | "Unknown"
  | "Checking"
  | "UpToDate"
  | "UpdateAvailable"
  | "Updating"
  | "UpdateError";
```

短期可以不一次性迁移，但后续新增升级、自启、模型诊断时，应朝这个结构演进。

---

## 10. 分阶段落地建议

### Phase 1：补齐状态语义

- 增加 `Uninstalling`
- 增加 `Upgrading`
- 增加 `Checking`
- 增加 `Planning`
- 增加 `NeedsReview`
- 增加 `Diagnosing`
- 增加 `Repairing`

### Phase 2：拆分运行态

- 将 `Launching`、`Running` 从安装状态中拆出
- 引入 `RuntimeStatus`
- 保留兼容层，避免一次性破坏前端展示

### Phase 3：支持工具级自动更新

- 增加版本检测配置
- 增加更新策略
- 增加 `UpdateAvailable` 与 `Upgrading`
- 接入外部模型生成升级计划

### Phase 4：支持工具级开机自启

- 增加工具级自启设置
- 优先实现 `AppManaged` 模式
- 自启失败后接入日志诊断

---

## 11. 当前推荐结论

工具生命周期管理应被理解为一个组合能力，而不是单个状态字段。

短期必须补齐：

- `Uninstalling`
- `Upgrading`
- `Checking`
- `Planning`
- `NeedsReview`
- `Diagnosing`
- `Repairing`

中期应拆分：

- 安装生命周期
- 运行生命周期
- 更新生命周期

长期应补齐：

- 工具级自动更新
- 工具级开机自启
- 模型辅助修复
- 计划审查与调用预算控制

最终目标是让工具具备完整的“安装、运行、升级、诊断、修复、自启、清理”管理闭环。

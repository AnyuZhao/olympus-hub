# 配置编排优先实施方案

## 1. 方向调整

前期不引入大模型解决安装问题，改为优先建设**配置编排能力**。

也就是说，第一阶段目标不是让模型根据文档实时生成安装方案，而是由产品或维护者提前把工具安装流程配置好，Olympus Hub 负责按配置进行：

- 环境检测
- 依赖检测
- 条件判断
- 安装步骤编排
- 卸载、升级、自启等生命周期动作
- 日志记录与失败建议

大模型能力可以作为后续增强能力，而不是前期主路径。

---

## 2. 为什么先做配置编排

### 2.1 可控性更强

安装工具会执行本机命令。前期使用配置编排，可以让命令来源、执行顺序、失败处理和校验规则全部可审计、可测试。

### 2.2 上线风险更低

不依赖外部模型后，前期可以避免：

- API key 管理
- 模型调用失败
- 模型输出不稳定
- 调用成本控制
- 模型幻觉生成危险命令

### 2.3 更适合打底座

配置编排能力建好后，即使后续接入大模型，模型也只需要生成或补充配置，而不是直接参与执行。

---

## 3. 前期目标

前期目标是让工具安装从“简单命令数组”升级为“可编排安装流程”。

核心体验：

1. 管理员为工具维护结构化安装配置
2. 用户在工具列表点击安装
3. 系统根据配置执行环境检测与依赖检测
4. 系统根据条件选择合适安装路径
5. 系统按步骤执行安装、验证、日志记录
6. 失败时根据配置给出明确建议
7. 后续支持配置驱动的卸载、升级、开机自启

---

## 4. 配置编排能力范围

### 4.1 工具定义

每个工具至少包含：

- 工具 ID
- 名称
- 描述
- 分类
- 官网链接
- 安装文档链接
- 来源类型
- 当前推荐版本

### 4.2 环境条件

支持配置安装前条件：

- 操作系统
- CPU 架构
- 最低磁盘空间
- 网络要求
- 必需依赖
- 可选依赖
- PATH 检查

### 4.3 安装步骤

安装流程不再只是字符串数组，而是步骤对象。

示例：

```json
{
  "id": "install-package",
  "name": "安装 npm 包",
  "command": "npm install -g @openai/codex",
  "stage": "Install",
  "required": true,
  "timeout_seconds": 300,
  "retry": {
    "max_attempts": 1
  },
  "on_failure": {
    "message": "npm 安装失败，请检查网络或 npm registry 配置。",
    "suggestions": [
      "确认 npm 可以访问外网",
      "检查代理设置",
      "尝试切换 npm registry"
    ]
  }
}
```

### 4.4 条件分支

支持按条件选择步骤，例如：

- Windows 使用 `winget`
- macOS 使用 `brew`
- Linux 使用 `apt` / `dnf` / `curl download` 等配置路径

### 4.5 安装后验证

支持配置验证步骤：

- 执行版本命令
- 检查可执行文件是否存在
- 检查服务端口是否启动
- 检查配置文件是否生成

### 4.6 卸载步骤

卸载也使用编排步骤，而不是单独命令数组。

### 4.7 升级步骤

升级可由配置定义：

- 版本检测命令
- 远端版本来源
- 升级命令
- 升级后验证
- 是否允许自动升级

### 4.8 工具级开机自启

前期建议先支持 `AppManaged` 模式：

```text
系统登录 -> Olympus Hub 自启 -> 根据工具配置启动指定工具
```

这样不需要每个工具都直接写系统登录项，风险更低，日志也更集中。

---

## 5. 配置模型草案

### 5.1 ToolDefinition

```ts
interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  homepage_url: string | null;
  install_docs_url: string | null;
  source: ToolSource;
  requirements: ToolRequirements;
  lifecycle: ToolLifecycleConfig;
  orchestration: ToolOrchestrationConfig;
}
```

### 5.2 ToolOrchestrationConfig

```ts
interface ToolOrchestrationConfig {
  install: OrchestrationFlow;
  uninstall: OrchestrationFlow;
  upgrade: OrchestrationFlow | null;
  repair: OrchestrationFlow | null;
  verify: OrchestrationFlow | null;
}
```

### 5.3 OrchestrationFlow

```ts
interface OrchestrationFlow {
  steps: OrchestrationStep[];
  failure_policy: FailurePolicy;
}
```

### 5.4 OrchestrationStep

```ts
interface OrchestrationStep {
  id: string;
  name: string;
  stage: "EnvCheck" | "DepCheck" | "Install" | "PostInstall" | "Launch" | "Uninstall" | "Upgrade" | "Repair";
  command: string | null;
  condition: StepCondition | null;
  required: boolean;
  timeout_seconds: number | null;
  retry: RetryPolicy | null;
  on_failure: FailureHint | null;
}
```

### 5.5 FailureHint

```ts
interface FailureHint {
  message: string;
  suggestions: string[];
  docs_url: string | null;
}
```

---

## 6. 后端模块优先级调整

原模块拆分中涉及模型的模块后移。前期优先级调整为：

1. `tool_catalog`：工具定义加载与校验
2. `tool_state`：生命周期状态管理
3. `orchestration`：配置编排解析与执行计划生成
4. `executor`：执行编排步骤
5. `policy`：命令安全与条件策略
6. `log_summary`：日志摘要与失败建议
7. `updater`：配置驱动升级
8. `autostart`：工具级自启

后移模块：

- `model_client`
- `diagnosis`
- 模型调用预算相关模块

---

## 7. 前期实施阶段

### Phase 1：扩展工具配置模型

目标：让工具配置可以描述官网、安装文档、生命周期配置和编排流程。

任务：

- 新增 `ToolDefinition`
- 新增 `ToolRequirements`
- 新增 `ToolLifecycleConfig`
- 新增 `ToolOrchestrationConfig`
- 保持旧版 `Tool` 配置兼容

测试：

- 旧版工具配置可以加载
- 新版工具配置可以加载
- 缺失可选字段时有默认值
- 非法步骤 ID 或空命令会被拒绝

### Phase 2：编排执行器

目标：把 install/uninstall/upgrade/repair 从命令数组升级为步骤流。

任务：

- 新增 `orchestration.rs`
- 新增 `OrchestrationFlow`
- 新增 `OrchestrationStep`
- 支持条件判断
- 支持步骤级失败提示
- 支持 retry 策略

测试：

- 条件命中时执行对应步骤
- 条件不命中时跳过步骤
- required 步骤失败会中止流程
- optional 步骤失败会继续流程

### Phase 3：生命周期状态补齐

目标：支持安装、卸载、升级、自启和修复所需状态。

任务：

- 增加 `Checking`
- 增加 `Installing`
- 增加 `Installed`
- 增加 `Uninstalling`
- 增加 `Upgrading`
- 增加 `Repairing`
- 增加 `Error`
- 后续再拆运行态

测试：

- 状态切换符合流程
- 卸载中不会显示安装按钮
- 升级中不会允许重复升级
- 失败状态保留错误信息

### Phase 4：配置驱动升级

目标：支持不依赖模型的版本检查和升级流程。

任务：

- 支持 `version_check_command`
- 支持 `upgrade` flow
- 支持 `UpdateAvailable`
- 支持手动升级按钮

测试：

- 版本解析正确
- 检测到新版本时进入 `UpdateAvailable`
- 升级失败时保留原安装状态

### Phase 5：工具级开机自启

目标：支持配置驱动的工具自启。

任务：

- 增加工具级 `autostart_enabled`
- 支持 `AppManaged` 模式
- 应用启动后按配置拉起工具
- 自启失败写日志

测试：

- 禁用自启时不启动工具
- 启用自启时生成启动任务
- 启动失败会记录日志

### Phase 6：失败建议与日志摘要

目标：不依赖模型，也能给用户可读的失败建议。

任务：

- 支持步骤级 `on_failure`
- 支持按错误关键字匹配建议
- 支持日志摘要
- 安装失败时展示配置内建议

测试：

- 命中失败建议
- 未命中时展示通用建议
- 日志摘要长度受控

---

## 8. 大模型能力如何后续接入

配置编排能力完成后，大模型可以作为增强层接入：

- 根据官网文档生成初始配置
- 根据失败日志建议修改配置
- 根据工具升级文档生成 upgrade flow
- 根据用户环境推荐条件分支

但执行路径仍然保持：

```text
模型生成或建议配置
  -> 本地校验
  -> 写入配置
  -> 配置编排执行器执行
```

模型不直接执行命令，也不绕过配置编排层。

---

## 9. 与既有文档的关系

- `docs/core-capabilities.md`：仍然成立，配置编排是执行层和定义层的优先落地方式
- `docs/tool-lifecycle-and-management.md`：仍然成立，生命周期状态和自动更新/自启能力继续推进
- `docs/external-model-install-requirements.md`：调整为后续增强路线，不作为前期主路径
- `docs/module-implementation-plan.md`：实施顺序需要以本文档为准，先做配置编排，再接大模型

---

## 10. 当前推荐结论

前期应优先建设“配置编排安装平台”，而不是直接引入大模型安装。

推荐路线：

1. 扩展工具配置模型
2. 建立编排步骤模型
3. 建立配置驱动执行器
4. 补齐工具生命周期状态
5. 支持自动更新与工具级开机自启
6. 支持配置化失败建议与日志摘要
7. 后续再接入大模型生成配置或诊断建议

这样可以先把平台底座打稳，再把大模型作为“配置生成器”和“诊断辅助器”接入，而不是让大模型成为安装流程的核心依赖。

---
name: feat-exec
description: 按照 plan.md 自动执行开发任务，支持断点续传。触发词: "feat exec", "执行任务", "开始开发"
---

# Feat Exec - 执行开发任务

> 共享工具: `<skill-path>/references/feat-utils.md`

## 执行流程

### 步骤 1: 获取 feat 名称

未指定 name 则从 `git branch --show-current` 获取。

### 步骤 2: 检查 plan.md

路径：`docs/features/feat-{name}/dev/plan.md`。不存在则提示先运行 `/fe-dev:feat-gen`。

### 步骤 3: 解析任务列表

从 `## 任务拆分` 表格提取任务（任务名、需求点、优先级、状态）。

### 步骤 4: 判断执行状态

- 全部已完成 → 提示并退出
- 有进行中 → 提示当前进度
- 有待开始 → 继续选择执行模式

### 步骤 5: 选择执行模式

AskUserQuestion：
- **继续执行**（推荐）— 找到第一个未完成任务
- **选择任务** — 用户手动选择
- **重新开始** — 重置所有状态

### 步骤 6: 执行单个任务

1. 更新 plan.md 状态为"进行中"
2. 读取需求上下文
3. 构建执行提示
4. 用户确认
5. 执行代码
6. 询问继续下一个 / 暂停

### 步骤 7: 更新 plan.md 任务状态

### 步骤 8: 记录执行日志

写入 `docs/features/feat-{name}/dev/exec.md`，格式：`- [{时间}] {消息}`

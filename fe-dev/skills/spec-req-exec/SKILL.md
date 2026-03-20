---
name: spec-req-exec
description: 按需求计划逐任务执行开发（支持断点续传）。触发词: "req-exec", "执行需求计划"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Spec Req-Exec - 按需求计划执行开发任务

读取 req-gen 生成的 plan.md，逐任务执行开发工作，支持断点续传。

## 执行流程

### 步骤 1: 获取分支名和 git 根目录

```bash
git branch --show-current
git rev-parse --show-toplevel
```

`feat/xxx` → `xxx` 作为 branchKey；非 feat 分支 → 完整分支名。

### 步骤 2: 检查 plan.md

路径：`{GIT_ROOT}/apps/frontend/docs/{branchKey}/plan.md`。

不存在则提示先运行 `/fe-dev:spec-req-gen`。

### 步骤 3: 解析任务列表

从 plan.md 的 `### Phase` 章节提取任务：

```
### Phase 1: {阶段名}

- [ ] **{任务名}**
  - 涉及文件: `{文件路径}`
  - 步骤:
    1. {步骤 1}
    2. {步骤 2}
  - 依赖: 无
```

提取每个任务的：任务名、Phase、涉及文件、执行步骤、依赖关系。

### 步骤 4: 检查依赖的前置任务

对每个未完成任务，检查其依赖项是否已完成：
- 依赖未完成 → 标记为"等待中"
- 依赖已完成或无依赖 → 标记为"可执行"

### 步骤 5: 判断执行状态

- 全部已完成 → 输出摘要并退出
- 有进行中 → 提示当前进度，询问继续/暂停
- 有可执行 → 继续选择执行模式
- 全部等待中 → 提示"所有未完成任务的前置依赖尚未完成"

### 步骤 6: 选择执行模式

AskUserQuestion：
- **继续执行**（推荐）— 找到第一个可执行任务
- **选择任务** — 列出可执行任务让用户选择
- **重新开始** — 重置所有任务状态

### 步骤 7: 执行单个任务

1. 更新 plan.md 中该任务状态为 `[~]`（进行中）
2. 读取需求上下文：
   - `{GIT_ROOT}/apps/frontend/docs/{branchKey}/requirements.md`（如有）
   - 任务"涉及文件"中已存在的文件（作为参考）
3. 将任务的执行步骤作为开发指令，执行代码编写
4. 完成后将任务状态更新为 `[x]`（已完成）
5. 询问：继续下一个 / 暂停

### 步骤 8: 记录执行日志

写入 `{GIT_ROOT}/apps/frontend/docs/{branchKey}/exec.md`，格式：

```markdown
# 执行日志

## {日期}

- [{时间}] ✅ 完成: {任务名}（Phase {N}）
- [{时间}] ⏳ 开始: {任务名}（Phase {N}）
- [{时间}] ⏸️ 暂停: {任务名}（Phase {N}）
```

### 步骤 9: 输出进度

每次任务完成后输出：

```
📋 执行进度: {已完成}/{总任务数}
  ✅ Phase 1: 3/3 已完成
  🔄 Phase 2: 1/4 进行中
  ⏳ Phase 3: 0/3 等待中
```

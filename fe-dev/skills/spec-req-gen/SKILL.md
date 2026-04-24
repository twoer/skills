---
name: spec-req-gen
description: 分析需求文档，生成需求分析和执行计划。触发词: "req-gen", "需求分析", "生成计划"
allowed-tools: Read, Grep, Glob, Bash, Write, Skill
---

# Spec Req-Gen - 需求文档分析与执行计划生成

分析分支对应的需求文档，调用 Superpowers 生成结构化的需求分析文档和执行计划。

## 执行流程

### 步骤 1: 获取分支名和 git 根目录

```bash
git branch --show-current
git rev-parse --show-toplevel
```

`feat/xxx` → `xxx` 作为 branchKey；非 feat 分支 → 完整分支名。

### 步骤 2: 搜索需求文档

Glob 搜索 `{GIT_ROOT}/specs/{branchKey}/docs/**/*.md`。

- 找到多个文件 → AskUserQuestion 让用户选择
- 只有一个 → 自动选中
- 没找到 → 搜索 `{GIT_ROOT}/specs/**/docs/**/*.md`，让用户选择
- 仍然没有 → 提示用户指定文档路径

### 步骤 3: 读取项目上下文

读取以下文件，为 Superpowers 提供项目背景：

| 文件 | 用途 |
|------|------|
| `{GIT_ROOT}/CLAUDE.md` | 项目开发规范和约定 |
| `{GIT_ROOT}/apps/frontend/package.json` | 前端技术栈和依赖 |
| `{GIT_ROOT}/apps/frontend/nuxt.config.ts` | Nuxt 配置（如存在） |
| `{GIT_ROOT}/apps/frontend/docs/{branchKey}/design.md` | **详细设计文档（如存在）** |

如果文件不存在则跳过，不报错。

**design.md 存在时的特殊处理**：作为 brainstorming 的**补充输入**（提供已对齐的架构决策、接口契约、改动清单），brainstorming 应聚焦任务拆分完整性，不要重复推导架构。

### 步骤 4: 读取需求文档

读取用户选中的需求文档全文。

### 步骤 5: 检测 Superpowers 可用性

检查 `superpowers:brainstorming` 是否可用。

**不可用时**，通过 AskUserQuestion 提示并提供选项：

```
superpowers 插件未安装。安装后可生成更高质量的需求分析和执行计划。

安装方式：
  /plugin marketplace add obra/superpowers-marketplace
  /plugin install superpowers@superpowers-marketplace

选项：
1. 继续使用简化版生成（无需安装）
2. 取消，安装后重新运行
```

### 步骤 6: 生成需求分析与执行计划

**如果 `superpowers:brainstorming` 可用**（推荐）：

按顺序调用两个 Superpowers skill：

1. **调用 `superpowers:brainstorming`**

   传入：
   - 需求文档全文
   - 项目上下文（步骤 3 读取的内容）
   - **design.md（如存在）**：以 design.md 的架构决策、接口契约、改动清单为准
   - 要求：从前端视角分析需求，输出结构化的需求分析文档；有 design.md 时聚焦任务拆分完整性，不重复推导架构

   输出内容应包含：
   - 需求概述（目标、背景、范围）
   - 功能点拆分（模块 → 子功能 → 验收条件）
   - 技术约束和依赖
   - UI 页面清单（涉及哪些页面/组件）

2. **调用 `superpowers:writing-plans`**

   传入：
   - brainstorming 的输出结果
   - 项目上下文

   输出内容应包含：
   - 任务拆分（按模块分组，每个任务含具体步骤）
   - 任务优先级和依赖关系
   - 涉及的文件路径（types、composables、pages）
   - 预估复杂度

**否则（兜底）**：

AI 直接分析需求文档，按以下模板格式生成：

**requirements.md 模板：**

```markdown
# {branchKey} - 需求分析

## 概述

> 来源: {需求文档路径}

{需求目标和背景}

## 范围

### 包含

- {功能点 1}
- {功能点 2}

### 不包含

- {排除项}

## 功能拆分

### {模块名}

#### {子功能}
- **描述**: {功能描述}
- **验收条件**: {可验证的标准}

## UI 页面清单

| 页面 | 路径 | 说明 |
|------|------|------|

## 技术约束

- {约束 1}
- {约束 2}
```

**plan.md 模板：**

```markdown
# {branchKey} - 执行计划

## 目标

{一句话目标}

## 任务拆分

### Phase 1: {阶段名}

- [ ] **{任务名}**
  - 涉及文件: `{文件路径}`
  - 步骤:
    1. {步骤 1}
    2. {步骤 2}
  - 依赖: 无

### Phase 2: {阶段名}

- [ ] **{任务名}**
  - 涉及文件: `{文件路径}`
  - 步骤:
    1. {步骤 1}
  - 依赖: Phase 1.{任务序号}

## 风险点

- {风险 1}: {应对措施}
```

**无论哪条路径，有 design.md 时都需要**：

- plan.md 的"任务拆分"优先引用 design.md 的"三、详细设计"和"七、改动说明"章节
- 任务粒度对齐 design 里的模块/问题单元
- 涉及文件路径、方法签名、类型定义直接**引用** design 的对应锚点，不复述

### 步骤 7: 写入输出文件

输出目录：`{GIT_ROOT}/apps/frontend/docs/{branchKey}/`

如果目录不存在则自动创建。

| 文件 | 内容来源 |
|------|---------|
| `requirements.md` | 步骤 6 的需求分析（superpowers 或 AI 兜底） |
| `plan.md` | 步骤 6 的执行计划（superpowers 或 AI 兜底） |

如果文件已存在 → 提示用户确认覆盖。

### 步骤 8: 输出摘要

```
✅ 需求分析与执行计划已生成
📄 需求文档: {需求文档路径}
📁 需求分析: apps/frontend/docs/{branchKey}/requirements.md
📁 执行计划: apps/frontend/docs/{branchKey}/plan.md
📋 任务数量: {N} 个
🎨 使用了 design.md 作为补充输入: {是/否}
🔗 依赖 Superpowers: {是/否（降级模式）}
```

如果使用了 design.md，额外提示：
- 建议审查 plan.md 的任务拆分是否覆盖 design.md 中所有"改动说明"条目
- 若 design.md 有更新，建议重新运行 `/fe-dev:spec-req-gen` 以同步任务

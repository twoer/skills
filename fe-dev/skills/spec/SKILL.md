---
name: spec
description: Spec 规范工具集。触发词: "spec", "API 同步", "生成接口", "OpenAPI", "规范同步", "需求分析", "req-gen", "生成计划", "req-exec", "执行需求计划"
allowed-tools: Read, Grep, Glob, Bash, Write, Skill
---

# Spec Kit - 规范工具集

规范相关的工具集合，根据子命令路由到对应流程。

> **语言要求**：所有输出统一使用中文，代码和文件路径保持英文。

## 命令路由

根据用户输入的参数，执行对应子命令：

| 子命令 | 说明 |
|--------|------|
| `api-sync` | OpenAPI 规范同步（默认） |
| `req-gen` | 需求文档分析与执行计划生成 |
| `req-exec` | 按需求计划执行开发任务（支持断点续传） |

无参数时默认执行 `api-sync`。

---

## req-gen - 需求文档分析与执行计划生成

分析分支对应的需求文档，调用 Superpowers 生成结构化的需求分析文档和执行计划。

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

如果文件不存在则跳过，不报错。

### 步骤 4: 读取需求文档

读取用户选中的需求文档全文。

### 步骤 5: 检测 Superpowers 可用性

检查 `superpowers:brainstorming` 是否可用。

### 步骤 6a: Superpowers 路径

按顺序调用两个 Superpowers skill：

**6a-1. 调用 `superpowers:brainstorming`**

传入：
- 需求文档全文
- 项目上下文（步骤 3 读取的内容）
- 要求：从前端视角分析需求，输出结构化的需求分析文档

输出内容应包含：
- 需求概述（目标、背景、范围）
- 功能点拆分（模块 → 子功能 → 验收条件）
- 技术约束和依赖
- UI 页面清单（涉及哪些页面/组件）

**6a-2. 调用 `superpowers:writing-plans`**

传入：
- brainstorming 的输出结果
- 项目上下文

输出内容应包含：
- 任务拆分（按模块分组，每个任务含具体步骤）
- 任务优先级和依赖关系
- 涉及的文件路径（types、composables、pages）
- 预估复杂度

### 步骤 6b: 降级路径（无 Superpowers）

直接 AI 分析需求文档，按以下模板格式生成：

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

### 步骤 7: 写入输出文件

输出目录：`{GIT_ROOT}/apps/frontend/docs/{branchKey}/`

如果目录不存在则自动创建。

| 文件 | 内容来源 |
|------|---------|
| `requirements.md` | 步骤 6a-1 或 6b 的需求分析 |
| `plan.md` | 步骤 6a-2 或 6b 的执行计划 |

如果文件已存在 → 提示用户确认覆盖。

### 步骤 8: 输出摘要

```
✅ 需求分析与执行计划已生成
📄 需求文档: {需求文档路径}
📁 需求分析: apps/frontend/docs/{branchKey}/requirements.md
📁 执行计划: apps/frontend/docs/{branchKey}/plan.md
📋 任务数量: {N} 个
🔗 依赖 Superpowers: {是/否（降级模式）}
```

---

## api-sync - OpenAPI 规范同步

从 OpenAPI 规范生成 TypeScript 类型和 useXxxService 文件。

### 步骤 1: 获取分支名和 git 根目录

```bash
git branch --show-current
git rev-parse --show-toplevel
```

`feat/xxx` → `xxx` 作为 branchKey；非 feat 分支 → 完整分支名。

### 步骤 2: 定位 openapi.yaml

以 `{GIT_ROOT}` 作为根目录，按优先级搜索：

1. `{GIT_ROOT}/specs/{branchKey}/contracts/openapi.yaml`
2. `{GIT_ROOT}/specs/{branchKey}/artifacts/contracts/openapi.yaml`
3. Glob 搜索 `{GIT_ROOT}/specs/{branchKey}/**/openapi.yaml`
4. Glob 搜索 `{GIT_ROOT}/specs/**/openapi.yaml`，让用户选择

> **说明**：用户通常在前端子目录下运行命令，而 `specs/` 目录可能位于 monorepo 根目录，因此必须从 git 根目录搜索，而非当前工作目录。

### 步骤 3: 解析 OpenAPI

提取 info、paths、components/schemas、tags。处理 `$ref` 引用。

### 步骤 4: 分析路径结构，确定模块拆分方案

**核心原则：基于 paths 路径层级拆分模块，而非基于 tags。**

- 无子模块：`app/types/auth.ts` + `app/composables/useAuthService.ts`
- 有子模块：`app/types/reports/cps.ts` + `app/composables/reports/useCpsReportService.ts`

AskUserQuestion 让用户确认方案。

### 步骤 5: 检查输出文件与残留文件

已有文件 → 追加 / 覆盖 / 跳过。残留文件 → 删除 / 保留。

### 步骤 6: 确保基础类型

读取 `useHttp` composable，检查 `app/types/api.ts` 是否存在，确保基础类型就绪。

### 步骤 7: 生成 TypeScript 类型

命名约定：`{Name}Model`（schema）、`{Name}FormModel`（请求体）、`SearchFormModel`（查询参数）。

不生成外层 ApiResponse 包装，枚举转 type，可选字段标记 `?:`。

### 步骤 8: 生成 Service 文件

每个端点一个方法，去除 `/api` 前缀。特殊处理：blob 下载、FormData、分页。

### 步骤 9: 更新导出

检查 `app/types/index.ts`，添加新生成的类型。

### 步骤 10: 类型检查

```bash
npx vue-tsc --noEmit
```

### 步骤 11: 输出报告

```
✅ API 规范同步完成
📄 源文件: specs/{branchKey}/contracts/openapi.yaml
📁 生成文件: Types (N types) + Services (N methods)
```

---

## req-exec - 按需求计划执行开发任务

读取 req-gen 生成的 plan.md，逐任务执行开发工作，支持断点续传。

### 步骤 1: 获取分支名和 git 根目录

```bash
git branch --show-current
git rev-parse --show-toplevel
```

`feat/xxx` → `xxx` 作为 branchKey；非 feat 分支 → 完整分支名。

### 步骤 2: 检查 plan.md

路径：`{GIT_ROOT}/apps/frontend/docs/{branchKey}/plan.md`。

不存在则提示先运行 `/fe-dev:spec req-gen`。

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

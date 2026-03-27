---
name: feat-new
description: 创建新功能开发工作流（目录 + Git 分支 + 文档模板）。触发词: "feat new", "新建功能", "创建功能", "开始新功能"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Feat New - 创建功能开发工作流

> 共享工具: `<skill-path>/references/feat-utils.md`
> 语言要求：所有输出统一使用中文，代码和文件路径保持英文。

## 重要提示

**执行时必须完整执行所有步骤，不能只问用户问题就停止！**

正确：git 检查 → 交互获取信息 → 选择分支 → 处理未提交代码 → 创建分支 → 创建目录 → 生成文档 → 询问原型

错误（禁止）：
- 只问"要创建哪个功能？"然后停止
- 自己推测功能名称，只问用户确认
- 跳过 Git 检查直接创建目录

## 执行流程

### 步骤 1: 前置检查

```bash
git rev-parse --is-inside-work-tree   # 是否 Git 仓库
git status --porcelain                # 工作区状态
```

### 步骤 2: 获取功能信息

使用 AskUserQuestion **一次性**获取 3 个信息：

1. **功能名称** — kebab-case（必填）
2. **功能描述** — 中文即可（必填）
3. **需求文档 URL** — 选填

### 步骤 2.5: 选择源分支

```bash
git branch --format='%(refname:short)'
```

AskUserQuestion 让用户选择：当前分支（默认）/ master / develop / 其他

无论选择哪个分支，都拉取最新代码：
```bash
git checkout {baseBranch}
git pull origin {baseBranch}
```

### 步骤 3: 处理未提交代码

仅当 `git status --porcelain` 有输出时触发。选项：Stash 暂存 / 先提交 / 取消操作

### 步骤 4: 创建 Git 分支

```bash
git checkout -b feat/{feature-name}
```

### 步骤 5: 创建目录结构

```bash
mkdir -p docs/features/feat-{name}/requirements
mkdir -p docs/features/feat-{name}/dev
```

### 步骤 6: 生成文档文件

从 `<skill-path>/templates/` 读取模板，替换变量后写入：

| 模板文件 | 输出路径 |
|----------|----------|
| feat-index.md | `docs/features/feat-{name}/index.md` |
| feat-plan.md | `docs/features/feat-{name}/dev/plan.md` |
| feat-exec.md | `docs/features/feat-{name}/dev/exec.md` |
| feat-test.md | `docs/features/feat-{name}/dev/test.md` |
| feat-review.md | `docs/features/feat-{name}/dev/review.md` |
| feat-links.md | `docs/features/feat-{name}/requirements/links.md` |

**index.md 变量替换：**

| 变量 | 来源 |
|------|------|
| `{name}` | 步骤 2 输入 |
| `{description}` | 步骤 2 输入 |
| `{createdAt}` | 当前时间 |
| `{author}` | `git config user.name` |
| `{baseBranch}` | 步骤 2.5 选择 |
| `{branchName}` | 同 name |
| `{requirementDoc}` | 步骤 2 输入（可为空） |
| `{prototypeUrl}` | 步骤 7 输入（可为空） |

如果提供了需求文档 URL，额外创建 links.md。

### 步骤 7: 补充原型地址（可选）

AskUserQuestion：暂无原型（默认）/ 输入 URL

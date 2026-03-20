---
name: commit
description: 代码审查 + 提交代码（可选推送）。触发词: "commit", "/commit", "提交", "git commit", "commit push", "提交推送", "git push"
allowed-tools: Read, Grep, Glob, Bash(git *), mcp__ast-lint__analyze_git_diff, mcp__ast-lint__analyze_file, mcp__ast-lint__analyze_code
---

# Commit - 审查并提交代码

先执行代码审查，通过后提交到本地仓库。加 `--push` 参数可同时推送到远程。

## 参数

- `--push`: 可选，提交后推送到远程仓库
- `<commit message>`: 可选提交信息，不提供则自动生成

## 使用方式

```
/fe-dev:commit                           # 审查 + 提交（不推送）
/fe-dev:commit 修复登录页面样式问题        # 指定提交信息
/fe-dev:commit --push                    # 审查 + 提交 + 推送
/fe-dev:commit --push feat: 新增用户管理模块
```

## 执行流程

### 1. 解析参数

- 检测是否包含 `--push` 标志
- 剩余部分作为 commit message（可选）

### 2. 检查 git 身份

```bash
git config user.name
git config user.email
```

- 两项均有值 → 继续
- 任一为空 → 提示用户先配置后退出：

```
当前仓库未配置 git 身份，请先执行：
  git config user.name "你的名字"
  git config user.email "你的邮箱"
```

### 3. 检查 git 状态

```bash
git status --short
```

- 无更改 → 提示并退出
- 有更改 → 继续

### 4. 代码审查（强制）

> 审查规则: `<skill-path>/references/code-review-rules.md`

执行 `/fe-dev:code-review` 的完整审查流程：

1. 检测 ast-lint MCP 是否可用
2. 如可用 → 先执行 ast-lint 静态分析，再执行语义审查（跳过 ast-lint 已覆盖项）
3. 如不可用 → 按 `code-review-rules.md` 全部规则执行语义审查
4. 输出审核报告

**审查结果判定：**

- `❌ 未通过`（有严重问题）→ **阻断提交**，输出报告，退出
- `⚠️ 有告警`（有重要问题）→ 输出报告，AskUserQuestion：**继续提交** / **取消修复后再提交**
- `✅ 审核通过`（仅建议或无问题）→ 继续

### 5. 分析变更并生成提交信息

用户未提供 commit message 时，自动生成。

```bash
git diff --cached --name-only    # 优先看已暂存
git diff --name-only             # 其次看工作区
git diff <文件路径>              # 查看具体变更
```

**格式**: `<类型>: <简短描述>`

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 新增用户管理组件` |
| `fix` | 修复 bug | `fix: 修复登录页面样式问题` |
| `refactor` | 重构代码 | `refactor: 优化组件结构` |
| `style` | 样式调整 | `style: 调整按钮颜色` |
| `chore` | 配置/依赖更新 | `chore: 更新 Tailwind 配置` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |

### 6. 执行 git 操作

```bash
git add .
git commit -m "<提交信息>"
```

如果指定了 `--push`：

```bash
git branch --show-current
git push origin <当前分支名>
```

### 7. 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 无更改 | 提示并退出 |
| 未配置 git 身份 | 提示配置后退出 |
| pre-commit hook 失败 | 报告错误，不执行 push |
| 代码审查未通过 | 阻断提交，输出审核报告 |
| push 失败（需先 pull） | 报告错误，提示手动处理 |
| push 失败（权限问题） | 报告错误信息 |

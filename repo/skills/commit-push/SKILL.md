---
name: commit-push
description: 提交代码并推送到远程仓库。触发词: "commit", "push", "/commit-push", "提交代码", "git commit", "git push"
allowed-tools:
  - Bash(git *)
  - Read
---

# Commit & Push

执行 git commit 和 push，自动生成提交信息。

## 参数

- `<commit message>`: 可选提交信息，不提供则自动生成

## 使用方式

```
/commit-push
/commit-push 修复登录页面样式问题
/commit-push feat: 新增用户管理模块
```

## 执行流程

### 1. 检查 git 身份

```bash
git config --local user.name
git config --local user.email
```

- 两项均有值 → 继续
- 任一为空 → 提示用户先配置后退出：

```
当前仓库未配置 git 身份，请先执行：
  git config --local user.name "你的名字"
  git config --local user.email "你的邮箱"
```

### 2. 检查 git 状态

```bash
git status --short
```

- 无更改 → 提示并退出
- 有更改 → 继续

### 3. 分析变更并生成提交信息

```bash
git diff --cached --name-only    # 优先看已暂存
git diff --name-only             # 其次看工作区
git diff <文件路径>              # 查看具体变更
```

用户未提供 commit message 时，自动生成：

**格式**: `<类型>: <简短描述>`

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 新增用户管理组件` |
| `fix` | 修复 bug | `fix: 修复登录页面样式问题` |
| `refactor` | 重构代码 | `refactor: 优化组件结构` |
| `style` | 样式调整 | `style: 调整按钮颜色` |
| `chore` | 配置/依赖更新 | `chore: 更新 Tailwind 配置` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |

**生成规则**:
- 修改 `.vue` 组件 → `fix` 或 `refactor`
- 新增组件文件 → `feat: 新增 XXX 组件`
- 修改样式文件 → `style` 或 `refactor`
- 修改配置文件 → `chore: 更新 XXX 配置`
- 修改文档 → `docs: 更新文档`

### 4. 执行 git 操作

```bash
git add .
git commit -m "<提交信息>"
git branch --show-current
git push origin <当前分支名>
```

### 5. 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 无更改 | 提示并退出 |
| 未配置 git 身份 | 提示配置后退出 |
| pre-commit hook 失败 | 报告错误，不执行 push |
| push 失败（需先 pull） | 报告错误，提示手动处理 |
| push 失败（权限问题） | 报告错误信息 |

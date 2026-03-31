---
name: commit
description: 提交代码到本地仓库（不推送）。触发词: "commit", "/commit", "提交", "git commit"
allowed-tools:
  - Bash(git *)
  - Read
  - Grep
  - Glob
---

# Commit

执行 git commit，自动生成提交信息，不推送远程。

## 参数

- `--check`: 可选，提交前对变更代码做审核，发现问题则阻断提交
- `<commit message>`: 可选提交信息，不提供则自动生成

## 使用方式

```
/repo:commit
/repo:commit 修复登录页面样式问题
/repo:commit feat: 新增用户管理模块
/repo:commit --check
/repo:commit --check feat: 新增用户管理模块
/repo:commit feat: 新增用户管理模块 --check
```

**参数解析**: 从 args 中移除 `--check` 标志，剩余部分作为 commit message。`--check` 可出现在任意位置。

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

### 3. 代码审核（仅 `--check` 时执行）

如果用户传入了 `--check` 标志，执行以下审核流程：

1. 获取变更文件列表：

```bash
git diff --name-only
git diff --cached --name-only
```

2. 逐个读取变更文件内容，重点审查变更行及其上下文

3. 审核内容：

- **基础代码审查**: 潜在 bug、逻辑错误、未使用变量、明显安全问题（如 XSS、命令注入等）
- **代码风格 + 质量**: 风格一致性、命名规范、可读性、不必要的复杂度

4. 输出审核报告，格式如下：

```
## 代码审核报告

### src/components/Login.vue
- [error] 第 42 行：`password` 直接拼接进 URL，存在注入风险
- [warning] 第 78 行：变量 `tempData` 已声明但未使用

### src/utils/format.ts
- [warning] 第 15 行：函数 `parseDate` 命名与已有 `formatDate` 风格不一致
```

5. 审核结果判定：

- 发现 **error** 或 **warning** → 阻断提交，输出审核报告，退出
- 无问题 → 输出「审核通过」，继续后续步骤

### 4. 分析变更并生成提交信息

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

### 5. 执行 git 操作

```bash
git add .
git commit -m "<提交信息>"
```

### 6. 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 无更改 | 提示并退出 |
| 未配置 git 身份 | 提示配置后退出 |
| pre-commit hook 失败 | 报告错误 |
| 代码审核发现问题 | 阻断提交，输出审核报告 |

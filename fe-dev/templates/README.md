# 模板变量说明

> 供 `feat new` 流程中替换模板占位符时参考。

## 变量列表

| 变量 | 说明 | 来源 | 示例值 |
|------|------|------|--------|
| `{name}` | 功能名称 (kebab-case) | 用户输入 | user-management |
| `{description}` | 功能描述 | 用户输入 | 用户管理模块开发 |
| `{createdAt}` | 创建时间 | 当前时间 | 2026-03-17 14:30 |
| `{author}` | 创建人 | `git config user.name` | zhangkun |
| `{baseBranch}` | 源分支 | 用户选择 | master |
| `{branchName}` | 分支名（同 name） | 同 name | user-management |
| `{requirementDoc}` | 需求文档链接 | 用户输入（可为空） | https://feishu.cn/doc/xxx |
| `{prototypeUrl}` | 原型地址 | 用户输入（可为空） | https://figma.com/file/xxx |

## 模板文件

| 模板文件 | 输出路径 | 使用的变量 |
|----------|----------|-----------|
| feat-index.md | `docs/features/feat-{name}/index.md` | 全部 |
| feat-plan.md | `docs/features/feat-{name}/dev/plan.md` | — |
| feat-exec.md | `docs/features/feat-{name}/dev/exec.md` | `{date}` |
| feat-test.md | `docs/features/feat-{name}/dev/test.md` | — |
| feat-review.md | `docs/features/feat-{name}/dev/review.md` | — |
| feat-links.md | `docs/features/feat-{name}/requirements/links.md` | — |

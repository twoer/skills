---
description: Git 提交和分支管理规范
---

# Git 规范

## 提交信息格式

```
<type>: <简短描述>
```

type 取值：
- `feat`: 新功能
- `fix`: 修复 Bug
- `refactor`: 重构（不改变功能）
- `style`: 样式/格式调整（不影响逻辑）
- `docs`: 文档变更
- `test`: 测试相关
- `chore`: 构建/工具/依赖变更

## 要求

- 提交信息用中文或英文均可，但同一项目保持一致
- 每次提交只做一件事，避免混合不相关的变更
- 禁止提交 node_modules、dist、.env 等生成/敏感文件
- 分支命名：`feature/xxx`、`fix/xxx`、`hotfix/xxx`

## 原因

清晰的提交历史是高效协作和问题追溯的基础。

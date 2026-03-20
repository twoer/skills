---
name: feat-list
description: 列出所有功能开发任务。触发词: "feat list", "功能列表", "查看功能列表"
allowed-tools: Read, Grep, Glob, Bash
---

# Feat List - 列出所有功能

> 共享约定: `<skill-path>/references/feat-utils.md`

## 执行流程

1. 检查 `docs/features/` 目录是否存在
2. 遍历所有 `feat-*` 文件夹
3. 读取每个 `index.md` 的基本信息
4. 格式化输出表格

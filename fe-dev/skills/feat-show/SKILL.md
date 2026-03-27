---
name: feat-show
description: 查看功能详情。触发词: "feat show", "功能详情", "查看功能"
allowed-tools: Read, Grep, Glob, Bash
---

# Feat Show - 查看功能详情

> 共享工具: `<skill-path>/references/feat-utils.md`
> 语言要求：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

1. 检查 `docs/features/feat-{name}/` 是否存在
2. 读取 `index.md` 内容
3. 美化输出

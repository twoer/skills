---
name: feat-done
description: 标记功能完成，准备合并。触发词: "feat done", "功能完成", "标记完成"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Feat Done - 标记功能完成

> 共享工具: `<skill-path>/references/feat-utils.md`
> 语言要求：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

1. 检查功能存在，确认当前状态为 `🚧 开发中`
2. 检查代码提交状态（未提交则提示）
3. 更新 index.md 状态为 `✅ 已完成`，记录完成时间
4. 询问后续操作：创建 PR/MR 或稍后处理

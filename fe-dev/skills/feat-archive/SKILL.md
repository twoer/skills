---
name: feat-archive
description: 归档已完成的功能。触发词: "feat archive", "功能归档", "归档"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Feat Archive - 归档功能

> 共享约定: `<skill-path>/references/feat-utils.md`

## 执行流程

1. 确认功能存在
2. 读取 `index.md`，确认当前状态为 `✅ 已完成`。如果是其他状态，提示用户先运行 `/fe-dev:feat-done`
3. 检查分支状态（是否已合并）
4. 更新 index.md 状态为 `📦 已归档`
5. 可选: 移动到 `docs/features/_archived/`

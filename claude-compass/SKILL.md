---
name: claude-compass
version: 1.0.0
description: 团队共享规则的链接、同步和管理。当用户提到"初始化规则"、"同步规则"、"创建规则"、"团队规范"时自动触发。
trigger: |
  当用户意图涉及以下场景时触发：
  - 新项目需要接入团队规范
  - 需要同步/更新团队共享规则
  - 需要创建或修改团队共享规则
  - 提到 "init rules"、"sync rules"、"create rule"
  - 提到 "团队规范"、"共享规则"
type: rigid
---

# Team Rules Manager

团队共享规则管理 Skill。负责规则的链接、同步、创建、健康检查和 CLAUDE.md 生成。

> **职责边界**：本 Skill 负责规则管理和 CLAUDE.md 生成，不做项目脚手架初始化。项目初始化由 `fe-dev:init` 负责。

## 子 Skill 路由

| 用户意图 | 子 Skill | 命令 |
|---------|---------|------|
| 新项目链接团队规则 | init | `/claude-compass:init` |
| 生成 CLAUDE.md | claude-init | `/claude-compass:claude-init` |
| 同步最新团队规则 | sync | `/claude-compass:sync` |
| 创建新的共享规则 | create | `/claude-compass:create` |
| 检查规则健康状态 | check | `/claude-compass:check` |

## 路由规则

1. 判断用户意图后，使用 Skill tool 调用对应子 Skill
2. 如果意图不明确，先询问用户要执行哪个操作
3. 如果当前项目未初始化（不存在 `.claude/rules/shared`），优先建议 `/claude-compass:init`
4. 如果用户只说"团队规范"或"规则"，先执行 `/claude-compass:check` 诊断当前状态

## 前置条件

所有子 Skill 执行前，先确认：

1. 共享规则源目录存在（默认 `~/.claude/skills/claude-compass/rules/`）
2. 当前目录是一个 Git 仓库

如果前置条件不满足，给出明确的修复指引后停止。

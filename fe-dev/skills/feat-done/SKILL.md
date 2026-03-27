---
name: feat-done
description: 标记功能完成，准备合并。触发词: "feat done", "功能完成", "标记完成"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Feat Done - 标记功能完成

> 共享约定: `<skill-path>/references/feat-utils.md`

## 执行流程

1. 检查功能存在，确认当前状态为 `🚧 开发中`（兼容 `📐 计划生成中`）
2. 检查 plan.md 任务完成度
   - 读取 `dev/plan.md` 中 `## 任务拆分` 表格的所有任务状态
   - 全部已完成 → 继续
   - 存在未完成任务 → AskUserQuestion：**强制标记完成** / **查看未完成任务** / **取消**
   - plan.md 不存在 → 跳过校验（提示用户无开发计划）
3. 检查代码提交状态（未提交则提示）
4. 更新 index.md 状态为 `✅ 已完成`，记录完成时间
5. 询问后续操作：创建 PR/MR 或稍后处理

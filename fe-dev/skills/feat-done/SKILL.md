---
name: feat-done
description: 标记功能完成，准备合并。触发词: "feat done", "功能完成", "标记完成"
allowed-tools: Read, Grep, Glob, Bash, Write, mcp__ast-lint__analyze_git_diff, mcp__ast-lint__analyze_file, mcp__ast-lint__analyze_code
---

# Feat Done - 标记功能完成

> 共享约定: `<skill-path>/references/feat-utils.md`
> 审查规则: `<skill-path>/references/code-review-rules.md`

## 参数

- `--push`: 可选，提交后推送到远程仓库

## 执行流程

1. 检查功能存在，确认当前状态为 `🚧 开发中`（兼容 `📐 计划生成中`）
2. 检查 plan.md 任务完成度
   - 读取 `dev/plan.md` 中 `## 任务拆分` 表格的所有任务状态
   - 全部已完成 → 继续
   - 存在未完成任务 → AskUserQuestion：**强制标记完成** / **查看未完成任务** / **取消**
   - plan.md 不存在 → 跳过校验（提示用户无开发计划）
3. 检查代码提交状态并串联提交流程
4. 更新 index.md 状态为 `✅ 已完成`，记录完成时间
5. 询问后续操作：创建 PR/MR 或稍后处理

### 步骤 3 详细说明：代码提交串联

```bash
git status --short
```

**情况 A：工作区干净（无未提交变更）**

→ 跳过，继续步骤 4

**情况 B：存在未提交变更**

提示用户并询问：

> 检测到未提交的变更（N 个文件），是否执行代码审查并提交？
> 1. **审查并提交** — 执行 code-review + commit
> 2. **审查并提交推送** — 执行 code-review + commit --push
> 3. **跳过** — 仅标记完成，稍后手动提交

选择 1 或 2 时，按 `/fe-dev:commit` 的完整流程执行：

1. 检查 git 身份（未配置则提示退出）
2. 执行代码审查（ast-lint + 语义审查）
   - `❌ 未通过` → 阻断，输出报告，退出（不标记完成）
   - `⚠️ 有告警` → 输出报告，询问继续或取消
   - `✅ 审核通过` → 继续
3. 分析变更，自动生成提交信息（格式：`feat: 完成 {featName} 功能开发`）
4. 执行 `git add . && git commit`
5. 若选择了"审查并提交推送"→ 执行 `git push origin <当前分支>`

提交成功后继续步骤 4；提交失败则报告错误并退出（不标记完成）。

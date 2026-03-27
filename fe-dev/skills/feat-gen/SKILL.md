---
name: feat-gen
description: 基于需求文档生成开发计划和测试计划。触发词: "feat gen", "生成计划", "生成开发计划", "生成测试计划"
allowed-tools: Read, Grep, Glob, Bash, Write, Skill
---

# Feat Gen - 生成开发计划和测试计划

> 共享工具: `<skill-path>/references/feat-utils.md`
> 语言要求：所有输出统一使用中文，代码和文件路径保持英文。

## `/fe-dev:feat-gen [name]` - 生成完整计划

### 步骤 1: 获取 feat 名称

未指定 name 则从 `git branch --show-current` 获取。

### 步骤 2: 检测需求文档

```bash
ls docs/features/feat-{name}/requirements/*.md 2>/dev/null | grep -v links.md
```

无需求文档则提示先运行 `/fe-dev:feat-req sync`。

### 步骤 3: 检查文件是否已存在

对 plan.md 和 test.md 分别检查：
- **已存在且无执行进度** → AskUserQuestion：备份后重新生成 / 取消 / 强制覆盖
- **已存在且有执行进度** → 同上，但警告会丢失进度

### 步骤 4: 检测 superpowers

检测 `superpowers:brainstorming` 是否可用：
- **可用** → 使用 superpowers 路径生成
- **不可用** → AskUserQuestion：继续简化版 / 取消

### 步骤 5: 读取需求文档

读取 `requirements/` 下所有最新版本 .md（排除 links.md 和 extra.md）。

### 步骤 6: 补充额外需求

AskUserQuestion 询问是否有额外需求，有则追加到 `requirements/extra.md`。

### 步骤 7: 生成

**7A（推荐）**: 调用 `superpowers:brainstorming` + `superpowers:writing-plans`

**7B（兜底）**: AI 直接分析需求，生成：
- `requirements/checklist.md` — 需求点清单
- `dev/plan.md` — 开发计划
- `dev/test.md` — 测试计划

### 步骤 8: 输出覆盖率报告

```
✅ 计划生成完成
📊 覆盖率报告: plan.md: 3/5 (60%), test.md: 4/5 (80%)
⚠️ 未覆盖的需求点: RQ-005: 记住密码功能
```

## `/fe-dev:feat-gen [name] plan` - 只生成开发计划

## `/fe-dev:feat-gen [name] test` - 只生成测试计划

---
name: feat-gen
description: 基于需求文档生成开发计划和测试计划。触发词: "feat gen", "生成计划", "生成开发计划", "生成测试计划"
allowed-tools: Read, Grep, Glob, Bash, Write, Skill
---

# Feat Gen - 生成开发计划和测试计划

> 共享约定: `<skill-path>/references/feat-utils.md`

## `/fe-dev:feat-gen [name]` - 生成完整计划

### 步骤 1: 获取 feat 名称 + 更新状态

未指定 name 则从 `git branch --show-current` 获取。

将 `index.md` 状态更新为 `📐 计划生成中`（当前为 `📝 需求采集中` 时）。

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
- **不可用** → 通过 AskUserQuestion 提示并提供选项：

```
superpowers 插件未安装。安装后可生成更高质量的开发计划。

安装方式：
  /plugin marketplace add obra/superpowers-marketplace
  /plugin install superpowers@superpowers-marketplace

选项：
1. 继续使用简化版生成（无需安装）
2. 取消，安装后重新运行
```

### 步骤 5: 读取需求文档与设计文档

读取 `requirements/` 下所有最新版本 .md（排除 links.md 和 extra.md）。

**额外读取 design.md（如存在）**：

```bash
ls docs/features/feat-{name}/design/design.md 2>/dev/null
```

- **存在** → 读入作为 brainstorming 的**补充输入**（提供已经对齐的架构决策、接口契约、改动清单）
- **不存在** → 跳过，仍按原流程基于 requirements/ 生成

### 步骤 6: 补充额外需求

AskUserQuestion 询问是否有额外需求，有则追加到 `requirements/extra.md`。

### 步骤 7: 生成

**如果 `superpowers:brainstorming` 可用**（推荐）：

- 调用 `superpowers:brainstorming` + `superpowers:writing-plans`
- 传入 requirements/ 全部文档
- 有 design.md 时额外传入，并说明："以 design.md 的架构决策、接口契约、改动清单为准，brainstorming 的输出应聚焦于任务拆分的完整性，不要重复推导架构"

**否则（兜底）**：

AI 直接分析需求，生成：
- `requirements/checklist.md` — 需求点清单
- `dev/plan.md` — 开发计划
- `dev/test.md` — 测试计划

**无论哪条路径，有 design.md 时都需要**：

- plan.md 的"任务拆分"优先引用 design.md 的"三、详细设计"和"七、改动说明"章节
- 任务粒度对齐 design 里的模块/问题单元
- 涉及文件路径、方法签名、类型定义直接**引用** design 的对应锚点，不复述

### 步骤 8: 输出覆盖率报告

```
✅ 计划生成完成
📊 覆盖率报告: plan.md: 3/5 (60%), test.md: 4/5 (80%)
⚠️ 未覆盖的需求点: RQ-005: 记住密码功能
🎨 使用了 design.md 作为补充输入: 是/否
```

如果使用了 design.md，额外提示：
- 建议审查 plan.md 的任务拆分是否覆盖 design.md 中所有"改动说明"条目
- 若 design.md 有更新，建议重新运行 `/fe-dev:feat-gen` 以同步任务

## `/fe-dev:feat-gen [name] plan` - 只生成开发计划

## `/fe-dev:feat-gen [name] test` - 只生成测试计划

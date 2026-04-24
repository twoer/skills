---
name: feat-design
description: 生成/更新前端详细设计文档，服务于技术评审和 AI 执行参考。触发词: "feat design", "详细设计", "设计文档", "feat-design"
allowed-tools: Read, Grep, Glob, Bash, Write, Skill
---

# Feat Design - 前端详细设计文档

> 共享约定: `<skill-path>/references/feat-utils.md`
> 文档模板: `<skill-path>/templates/design-template.md`

## 定位

生成/维护前端详细设计文档，**同时服务于两类读者**：

1. **技术评审** — 前端、后端、测试、TL 互相对照各自关心的章节
2. **AI 执行参考** — feat-gen / feat-exec 的上游输入

文档是**可选步骤**。复杂功能（新建页面、跨端协作、改造优化、性能/架构）推荐走；简单改动（bug 修复、小样式调整）跳过即可，直接 `feat-gen`。

## 子命令

| 命令 | 用途 |
|------|------|
| `/fe-dev:feat-design [name]` | 生成新设计文档 |
| `/fe-dev:feat-design [name] update` | 评审反馈后迭代修改 |
| `/fe-dev:feat-design [name] check` | 按模板末尾自检清单检查文档质量 |

---

## `/fe-dev:feat-design [name]` - 生成设计文档

### 步骤 1: 获取 feat 名称

未指定 name 则从 `git branch --show-current` 获取（遵循 `getFeatName` 约定）。

不在 feat 分支且未指定 name → 提示用户切换到功能分支或手动指定。

### 步骤 2: 检查目录与前置条件

```bash
ls docs/features/feat-{name}/index.md
```

- 不存在 → 提示先运行 `/fe-dev:feat-new`

检测需求与设计稿：

```bash
ls docs/features/feat-{name}/requirements/*.md 2>/dev/null | grep -v links.md
ls docs/features/feat-{name}/ui/specs/*-analysis.md 2>/dev/null
```

- **有需求文档** → 作为生成输入（主输入）
- **有 UI 分析** → 作为生成输入（辅助输入）
- **都没有** → AskUserQuestion 确认：继续生成（空白起稿）/ 先运行 `feat-req sync` / 取消

### 步骤 3: 检查 design.md 是否已存在

输出路径：`docs/features/feat-{name}/design/design.md`

- **不存在** → 直接进入步骤 4
- **已存在** → AskUserQuestion：
  - 备份为 `design-v{mtime}.md` 后重新生成
  - 取消（改为 `update` 子命令做增量）
  - 强制覆盖

### 步骤 4: 场景识别

通过 AskUserQuestion 询问功能性质（决定章节重心和组织方式）：

| 选项 | 说明 | 详细设计组织方式 | 七、改动说明 |
|------|------|------------------|--------------|
| 🆕 新建功能/页面 | 从 0 到 1 的新页面/新流程 | 按**模块**组织 | 删除本章 |
| 🔧 改造/优化 | 现有系统改动 | 按**关键问题**组织 | 必填 |
| 🔀 跨端协作 | 前后端/多端重点对齐 | 按**关键问题** + 强化接口章节 | 按需 |
| ⚡ 性能/架构升级 | 瓶颈优化、架构重构 | 按**关键问题** | 必填 |
| 🏗️ 新模块/新系统 | 新建模块或子系统 | 按**模块** | 删除本章 |

**自动建议**：先扫描 requirements/ 文件名和内容关键词（"优化"/"改造"/"新增"/"性能"），给出推荐选项让用户确认而非从头选。

### 步骤 5: 读取上下文

为生成提供项目背景：

| 文件 | 用途 | 不存在时 |
|------|------|---------|
| `docs/features/feat-{name}/index.md` | 功能元信息（变量替换源） | 报错退出 |
| `docs/features/feat-{name}/requirements/*.md` | 原始需求（排除 links.md） | 步骤 2 已处理 |
| `docs/features/feat-{name}/requirements/extra.md` | 追加需求（有则合并） | 跳过 |
| `docs/features/feat-{name}/ui/specs/*-analysis.md` | UI 分析笔记 | 跳过 |
| `CLAUDE.md`（项目根） | 项目开发规范 | 跳过 |
| `package.json` | 技术栈 | 跳过 |

### 步骤 6: 检测 Superpowers

检查 `superpowers:brainstorming` 是否可用。

**不可用**时通过 AskUserQuestion 提示：

```
superpowers 插件未安装。安装后可生成更高质量的设计文档。

安装方式：
  /plugin marketplace add obra/superpowers-marketplace
  /plugin install superpowers@superpowers-marketplace

选项：
1. 继续使用简化版生成（无需安装）
2. 取消，安装后重新运行
```

### 步骤 7: 生成设计文档

**如果 `superpowers:brainstorming` 可用**（推荐）：

按顺序调用：

1. **`superpowers:brainstorming`** — 传入需求全文 + UI 分析 + 项目上下文 + 选定场景，要求：
   - 按模板 `<skill-path>/templates/design-template.md` 的骨架组织
   - 按场景决定章节组合（参考步骤 4 表格）
   - 遵守模板顶部"写作原则"（内容密度 > 完整性）

2. **`superpowers:writing-plans`**（可选）— 如果用户后续不用 `feat-gen` 生成独立 plan.md，把"九、实施计划"一节也补上。否则此步跳过。

**否则（兜底）**：

AI 直接生成。读取 `<skill-path>/templates/design-template.md`，按以下规则：

1. **变量替换**（优先从 `docs/features/feat-{name}/index.md` 提取）：

   | 变量 | 值来源 |
   |------|--------|
   | `{name}` | feat 名称（步骤 1 获取） |
   | `{description}` | index.md 的「功能描述」字段 |
   | `{createdAt}` | 当前时间（如 `date '+%Y-%m-%d %H:%M'`） |
   | `{author}` | `git config user.name` |
   | `{branchFull}` | `git branch --show-current`（通常为 `feat/{name}`） |
   | `{requirementDoc}` | index.md 的「需求文档」字段，无则留空 |
   | `{prototypeUrl}` | index.md 的「原型地址」字段，无则留空 |

2. **按场景裁剪章节**（参考步骤 4 表格）
3. **内容密度约束**（严格遵守）：
   - 每节至少有一条决策/经验/契约信息，否则删除该节
   - 不复述 PRD / 设计稿里已有的字段描述（引用原文档即可）
   - 决策必须带理由（"选 A 不选 B 因为 …"）
   - 章节正文 < 3 行 → 删除该章节（连标题删）

**无论哪条路径**：

- 保留模板顶部的"写作原则"注释块 → 生成完成后删除（作引导，最终文档不留）
- 保留文档收尾的"自检清单"注释块 → 保留在最终文档（供后续 `check` 子命令用）

### 步骤 8: 写入与摘要

目录不存在则创建：

```bash
mkdir -p docs/features/feat-{name}/design
```

写入 `docs/features/feat-{name}/design/design.md`。

输出摘要：

```
✅ 设计文档已生成
📁 路径: docs/features/feat-{name}/design/design.md
🎯 场景: 🔧 改造/优化
📊 章节统计: 7/9（删除 "七、改动说明" 和 "九、实施计划"）
📝 关键决策数: 5
⚠️  建议: 评审前 AskUserQuestion 让作者补充 "五、关键决策" 的方案对比
🔗 依赖 Superpowers: 是/否（降级模式）
```

---

## `/fe-dev:feat-design [name] update` - 评审反馈迭代

评审后基于反馈修改 design.md。

### 步骤 1-2: 同生成流程

### 步骤 3: 读取现有 design.md

若不存在 → 提示先运行 `/fe-dev:feat-design [name]`。

### 步骤 4: 收集评审反馈

AskUserQuestion：
- 从对话中收集（用户直接粘贴评审意见）
- 从文件读取（指定反馈文件路径）
- 手动逐条输入

### 步骤 5: 增量修改

1. 解析反馈 → 定位影响的章节
2. 对每个章节：保留未涉及的内容，只修改相关部分
3. **不整体重写**（避免丢失已评审通过的其他章节）

### 步骤 6: 追加变更记录

在文档顶部的"变更记录"表格追加一行：

```markdown
| {today} | v1.0.1 | 评审反馈：{摘要} | {author} |
```

版本号规则：patch +1（v1.0.0 → v1.0.1）；若涉及重大方案调整（如更换技术选型）→ minor +1（v1.0.0 → v1.1.0）。

### 步骤 7: 输出摘要

```
✅ 设计文档已更新（v1.0.1）
📝 修改章节: 四、接口设计（4.2.1 新增字段）、六、异常与边界（新增 CORS 失败场景）
🔗 原版本已保留在 Git 历史
```

---

## `/fe-dev:feat-design [name] check` - 文档自检

对已有 design.md 按模板收尾的自检清单逐项检查。

### 检查项

| 项 | 检查方式 |
|---|---|
| 是否删除了无内容的章节 | 扫描章节正文，识别 < 3 行或只有注释的节 |
| 每节是否有决策/经验/契约 | 检测是否只有描述性内容（无"决定"/"理由"/"因为"等关键字） |
| 是否避免了重复 PRD | 对比 requirements/*.md，标记疑似重复段落 |
| 决策是否都带理由 | "五、关键决策"下每条要有"理由"子项 |
| 代码路径/方法签名是否精确 | 识别形如 `src/xxx/yyy.ts` 的路径，检查文件存在性 |
| 异常矩阵是否覆盖主路径 | 比对"二、整体设计"的流程节点，看"六、异常与边界"是否都有对应项 |

### 输出

```
📋 设计文档自检报告
✅ 通过: 4 项
⚠️  建议: 2 项
  - 章节 5.2 "MVP 取舍" 未写理由
  - 章节 4.2.1 引用的 src/api/material.ts 文件不存在
❌ 未通过: 0 项

是否打开文档定位问题？ [y/N]
```

---

## 与其他 skill 的联动

| skill | 联动方式 |
|-------|---------|
| `feat-new` | 创建 feat 目录时不强制生成 design 目录；feat-design 首次运行时按需创建 |
| `feat-req` | design 的输入源之一，feat-design 运行前建议先 sync |
| `ui-add` | design 的辅助输入，UI 分析结果会被读入 |
| `feat-gen` | **强联动**：feat-gen 运行前检测 design.md 是否存在，存在则优先作为输入（而不只依赖 requirements/） |
| `feat-update` | 需求变更时，feat-update 应提示"design.md 可能需要同步更新"，但不自动改 |
| `feat-exec` | 间接通过 plan.md 使用；feat-exec 不直接读 design.md |

---

## 注意事项

- **不强制评审状态机**：文档版本用变更记录表管理，评审通过与否由团队线下确认，skill 不校验
- **不自动推进 index.md 的 status 字段**：当前状态枚举不含"🎨 设计中"，feat-design 视为 `📝 需求采集中` 的延伸步骤
- **模板是"字段库"不是"必填清单"**：章节按场景和内容按需出现，避免占位式填充
- **重复 PRD 内容是反模式**：遇到表单字段、交互细节等 PRD 已有内容，引用 PRD 路径，不要复述

# Spec-Kit vs fe-dev 对比分析

> 分析时间: 2026-03-17
> 参考项目: https://github.com/github/spec-kit

## 概述

GitHub Spec-Kit 是一个 Spec-Driven Development (SDD) 工具包，核心理念是"先写规格，再写代码"。fe-dev 是面向 Nuxt4 + Element Plus 的前端开发工作流管理工具。两者在目标上有交集——都是为了提高开发效率和代码质量，但设计哲学不同。

| 维度 | Spec-Kit | fe-dev |
|------|----------|--------|
| 核心理念 | 规格驱动开发 | 工作流驱动开发 |
| 适用范围 | 任意软件项目 | 前端项目（Nuxt4） |
| 工作流 | constitution → specify → clarify → plan → tasks → implement | feat new → req → gen → exec → done |
| 产物 | constitution.md, spec.md, plan.md, tasks.md, research.md | index.md, plan.md, exec.md, test.md, review.md |
| 复杂度 | 较重（多阶段、严格约束） | 较轻（线性流程） |

---

## 可借鉴的点

### 1. Constitution（项目宪章）

**Spec-Kit 做法：** 有 `constitution.md` 定义项目级规则（技术约束、代码规范、命名约定等），所有后续阶段都受其约束。

**fe-dev 现状：** **已有等效方案**。`CLAUDE.md` 由 Claude Code 自动加载到上下文，本质上就是项目宪章。

**结论：** 不需要单独的 constitution.md。维护两份文件反而增加冗余和维护成本。CLAUDE.md 已足够承载项目级规则，且每次对话自动生效、零加载成本。

---

### ~~2. Clarify（结构化需求澄清）~~

**Spec-Kit 做法：** 有独立的 `/speckit.clarify` 命令，专门对需求文档进行结构化追问，输出澄清记录文档。

**fe-dev 现状：** **已有等效方案**。`feat gen` 流程会调用 superpowers 的 brainstorming skill，本身包含结构化的需求探索（意图澄清、边界条件、异常场景等追问维度）。

**结论：** 不需要借鉴。fe-dev 通过 superpowers 在对话中完成结构化分析，比 Spec-Kit 的文档化澄清更轻量，不需要额外维护 clarify 文档。

---

### 3. Tasks 与 Plan 分离

**Spec-Kit 做法：** 将 `plan.md`（方案设计）和 `tasks.md`（任务拆解）严格分开，tasks 支持依赖关系和并行标记 `[P]`。

**fe-dev 现状：** 任务表直接嵌入 `plan.md` 中，没有依赖管理和并行标记。

**建议：** 在 `feat gen` 生成的 plan.md 任务表中增加 `[P]` 并行标记和依赖列，让 `feat exec` 能识别可并行的任务。

**优先级：** 高（收益最大）

**具体方案：**

```markdown
## 任务表格式改进

当前格式：
| # | 任务 | 预估 | 依赖 |
|---|------|------|------|
| 1 | 创建 API 接口 | 30min | - |
| 2 | 创建 Store | 20min | 1 |

改进格式：
| # | 任务 | 预估 | 依赖 | 并行 |
|---|------|------|------|------|
| 1 | 创建 API 接口 | 30min | - | [P] |
| 2 | 创建 Store | 20min | - | [P] |
| 3 | 创建页面组件 | 40min | 1,2 | - |

其中 [P] 表示该任务可与其他 [P] 任务并行执行。
```

---

### 4. Research 文档

**Spec-Kit 做法：** 在规划前生成 `research.md`，记录技术调研（API 调研、依赖选型、风险评估）。

**fe-dev 现状：** 没有独立的技术调研阶段。

**建议：** 在 `feat gen` 中增加可选的 `research.md` 输出，特别是涉及新技术栈或第三方 API 集成时。

**优先级：** 中

**具体方案：**

```markdown
## research.md 模板

# 技术调研

## 调研目标
<!-- 本次功能需要调研的技术问题 -->

## 调研结果

### 1. [技术点名称]
- **方案选择：** 选定方案 A / B
- **理由：** ...
- **风险：** ...
- **参考：** 链接

## 结论
<!-- 调研结论和推荐方案 -->
```

---

### 5. 一致性检查

**Spec-Kit 做法：** 有 `/speckit.analyze` 命令，检查 spec/plan/tasks 之间的覆盖率和一致性。

**fe-dev 现状：** `feat gen` 步骤 8 有覆盖率报告，但没有跨文档一致性验证。

**建议：** 可在 `feat gen` 结束时增加一致性检查步骤（需求 → 计划 → 任务全覆盖）。

**优先级：** 中

**具体方案：**

```markdown
## 一致性检查清单

在 feat gen 完成后，自动验证：

1. 需求文档中的每个功能点 → plan.md 中有对应的设计方案
2. plan.md 中的每个设计方案 → 任务表中有对应的实现任务
3. 任务表中的每个任务 → test.md 中有对应的测试用例
4. 无孤立项：没有未被任何任务覆盖的需求，也没有无需求来源的任务
```

---

### 6. Checklist 验证

**Spec-Kit 做法：** `/speckit.checklist` 类似"单元测试"，可反复运行验证需求是否满足。

**fe-dev 现状：** `feat gen` 生成 `checklist.md`，`feat exec` 结束后参考它做 review，但没有自动验证机制。

**建议：** 在 `feat exec` 完成和 `feat review` 阶段，将 checklist 作为验证依据，逐条确认。

**优先级：** 低

---

## 不建议借鉴的部分

| Spec-Kit 概念 | 原因 |
|--------------|------|
| 过度严格的阶段划分 | fe-dev 的轻量化流程更适合日常开发 |
| 独立的 constitution.md | CLAUDE.md 已等效，无需重复维护 |
| Greenfield/Brownfield/Creative 阶段 | fe-dev 面向的是成熟 Nuxt4 项目，场景单一 |
| 独立的 spec.md 文档 | fe-dev 的需求文档（飞书/语雀）已是外部规格，无需重复 |

---

## 优先级排序

| 优先级 | 借鉴点 | 预期收益 | 实现难度 |
|--------|--------|---------|---------|
| ~~P1~~ | ~~#2 Clarify 结构化需求澄清~~ | ~~superpowers brainstorming 已覆盖~~ | ~~不适用~~ |
| P1 | #3 Tasks 并行标记 | 提升 exec 执行效率 | 低（改模板 + exec 解析） |
| P2 | #5 一致性检查 | 减少遗漏 | 中（新增检查步骤） |
| P2 | #4 Research 文档 | 规范技术调研 | 低（新增模板） |
| P3 | #6 Checklist 验证 | 提升交付质量 | 低（改 review 流程） |
| ~~P3~~ | ~~#1 Constitution~~ | ~~CLAUDE.md 已等效~~ | ~~不适用~~ |

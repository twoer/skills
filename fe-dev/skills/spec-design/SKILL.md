---
name: spec-design
description: 基于需求文档 + OpenAPI 生成前端详细设计文档（Spec Kit 流程）。触发词: "spec design", "spec-design", "spec 详细设计", "规范设计"
allowed-tools: Read, Grep, Glob, Bash, Write, Skill
---

# Spec Design - 前端详细设计文档（Spec Kit）

> 文档模板: `<skill-path>/templates/design-template.md`（与 feat-design 共用）

## 定位

Spec Kit 流程中的"详细设计"环节，产出同时服务：

1. **技术评审** — 前端、后端、测试、TL 互相对照
2. **AI 执行参考** — spec-req-gen / spec-req-exec 的上游输入

相对 `feat-design`，**spec-design 的核心增值**：自动从 `openapi.yaml` 提取接口列表并预填到设计文档的"4.2 后端对接接口"章节，作者只需专注架构决策和改动清单。

## 子命令

| 命令 | 用途 |
|------|------|
| `/fe-dev:spec-design [branchKey]` | 生成新设计文档 |
| `/fe-dev:spec-design [branchKey] update` | 评审反馈后迭代修改 |
| `/fe-dev:spec-design [branchKey] check` | 文档质量自检 |

---

## `/fe-dev:spec-design [branchKey]` - 生成设计文档

### 步骤 1: 获取分支名和 git 根目录

```bash
git branch --show-current
git rev-parse --show-toplevel
```

- `feat/xxx` → `xxx` 作为 `branchKey`
- 非 feat 分支 → 完整分支名作为 `branchKey`
- 用户显式传入 `branchKey` 参数时以参数为准

### 步骤 2: 搜索需求文档

按优先级（对齐 `spec-req-gen`）：

```bash
Glob: {GIT_ROOT}/specs/{branchKey}/docs/**/*.md
```

- 找到多个 → AskUserQuestion 让用户选择
- 只有一个 → 自动选中
- 没找到 → 搜索 `{GIT_ROOT}/specs/**/docs/**/*.md`，让用户选择
- 仍然没有 → 提示用户指定文档路径或取消

### 步骤 3: 定位 openapi.yaml（关键增值）

按优先级搜索（对齐 `spec-api-sync`）：

1. `{GIT_ROOT}/specs/{branchKey}/contracts/openapi.yaml`
2. `{GIT_ROOT}/specs/{branchKey}/artifacts/contracts/openapi.yaml`
3. Glob: `{GIT_ROOT}/specs/{branchKey}/**/openapi.yaml`

- **找到** → 进入步骤 4 解析
- **没找到** → 跳过 OpenAPI 解析，设计文档的"4.2 后端对接接口"章节留空或由作者手填
- **找到多个** → AskUserQuestion 让用户选择

### 步骤 4: 解析 OpenAPI（有 openapi.yaml 时）

提取以下信息用于预填模板 4.2 章节：

- **接口列表**：method + path + summary + operationId
- **请求参数**：Query/Path/Body schema
- **响应结构**：2xx 响应 schema
- **处理 `$ref` 引用**：展开到 components/schemas

**生成预填片段**（注入模板 4.2）：

```markdown
### 4.2.1 {summary} `{METHOD} {path}`

**用途**：{description 或 summary}

**请求参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| {param1} | {type} | 是/否 | {description} |

**响应结构**：

```ts
interface {ResponseSchemaName} {
  // 从 components/schemas 展开
}
```

> 本接口定义来自 `{openapi.yaml 路径}`，由 OpenAPI 自动生成，不要在此手动修改字段
```

### 步骤 5: 检查 design.md 是否已存在

输出路径：`{GIT_ROOT}/apps/frontend/docs/{branchKey}/design.md`

- **不存在** → 直接进入步骤 6
- **已存在** → AskUserQuestion：
  - 备份为 `design-v{mtime}.md` 后重新生成
  - 取消（改用 `update` 子命令做增量）
  - 强制覆盖

### 步骤 6: 场景识别

通过 AskUserQuestion 询问功能性质（决定章节重心）：

| 选项 | 说明 | 详细设计组织方式 | 七、改动说明 |
|------|------|------------------|--------------|
| 🆕 新建功能/页面 | 从 0 到 1 | 按模块组织 | 删除本章 |
| 🔧 改造/优化 | 现有系统改动 | 按关键问题组织 | 必填 |
| 🔀 跨端协作 | 前后端重点对齐 | 按关键问题 + 强化 4.2 | 按需 |
| ⚡ 性能/架构升级 | 瓶颈优化 | 按关键问题 | 必填 |

**自动建议**：扫描需求文档关键词（"优化"/"改造"/"新增"/"性能"）推荐选项让用户确认。

### 步骤 7: 读取项目上下文

| 文件 | 用途 | 不存在时 |
|------|------|---------|
| 步骤 2 选中的需求文档 | 需求输入（主输入） | — |
| 步骤 3 找到的 openapi.yaml | 接口契约（主输入） | 跳过 |
| `{GIT_ROOT}/CLAUDE.md` | 项目开发规范 | 跳过 |
| `{GIT_ROOT}/apps/frontend/package.json` | 技术栈 | 跳过 |
| `{GIT_ROOT}/apps/frontend/nuxt.config.ts` | Nuxt 配置 | 跳过 |
| `{GIT_ROOT}/apps/frontend/docs/{branchKey}/requirements.md` | 已有需求分析（如 spec-req-gen 跑过） | 跳过 |

### 步骤 8: 检测 Superpowers

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

### 步骤 9: 生成设计文档

**如果 `superpowers:brainstorming` 可用**（推荐）：

调用 `superpowers:brainstorming`，传入：

- 需求文档全文
- 项目上下文（步骤 7）
- 步骤 4 生成的 OpenAPI 预填片段（**不要让 brainstorming 重新推导接口**）
- 选定场景（步骤 6）
- 要求：按 `<skill-path>/templates/design-template.md` 骨架生成；4.2 章节直接使用预填片段；聚焦架构决策、流程分析、改动清单

**否则（兜底）**：

AI 直接生成。读取 `<skill-path>/templates/design-template.md`，按以下规则：

1. **变量替换**：

   | 变量 | 值来源 |
   |------|--------|
   | `{name}` | `branchKey` |
   | `{description}` | 需求文档首段 或 `openapi.info.title` |
   | `{createdAt}` | 当前时间 |
   | `{author}` | `git config user.name` |
   | `{branchFull}` | `git branch --show-current`（完整分支名，feat/xxx 或 dev-xxx 均直接使用，不额外拼前缀） |
   | `{requirementDoc}` | 步骤 2 选中的文档路径 |
   | `{prototypeUrl}` | 留空 |

2. **4.2 章节直接嵌入步骤 4 的 OpenAPI 预填片段**
3. 按场景裁剪章节（参考步骤 6 表格）
4. **内容密度约束**（严格遵守，与 feat-design 一致）：
   - 每节至少一条决策/经验/契约信息，否则删除该节
   - 不复述 PRD / 需求文档已有内容
   - 决策必须带理由
   - 章节正文 < 3 行 → 删除

**无论哪条路径**：

- 保留模板顶部"写作原则"注释块 → 生成完成后删除
- 保留文档收尾"自检清单"注释块 → 保留，供 `check` 子命令用
- 4.2 章节的接口契约与 OpenAPI 保持一致，不要手动编辑字段

### 步骤 10: 写入与摘要

目录不存在则创建：

```bash
mkdir -p {GIT_ROOT}/apps/frontend/docs/{branchKey}
```

写入 `{GIT_ROOT}/apps/frontend/docs/{branchKey}/design.md`。

输出摘要：

```
✅ 设计文档已生成
📁 路径: apps/frontend/docs/{branchKey}/design.md
🎯 场景: 🔧 改造/优化
📊 章节统计: 7/9
📝 关键决策数: 5
🔌 OpenAPI 预填接口数: 8（来自 specs/{branchKey}/contracts/openapi.yaml）
🔗 依赖 Superpowers: 是/否
```

---

## `/fe-dev:spec-design [branchKey] update` - 评审反馈迭代

基本逻辑同 `feat-design [name] update`，差异：

- 路径走 `{GIT_ROOT}/apps/frontend/docs/{branchKey}/design.md`
- **额外检查 OpenAPI 是否变更**：如果 openapi.yaml 的 mtime 晚于 design.md，AskUserQuestion 提示 "OpenAPI 已更新，是否重新拉取并更新 4.2 章节？"

### 步骤要点

1. 读取现有 design.md
2. 检查 openapi.yaml 是否变更 → 如变更，重新执行步骤 3-4 生成新的 4.2 预填
3. 收集评审反馈（从对话、文件或手动输入）
4. 解析反馈 → 定位影响章节 → 增量修改（不整体重写）
5. 追加变更记录到文档顶部变更表
6. 版本号递增（patch +1 或 minor +1）

---

## `/fe-dev:spec-design [branchKey] check` - 文档自检

复用 `feat-design check` 的检查项 + Spec 特有：

| 检查项 | 方式 |
|---|---|
| 通用六项 | 同 feat-design |
| **4.2 章节接口是否与当前 openapi.yaml 一致** | 重新解析 openapi → 对比 design.md 的 4.2 章节，标记差异 |
| **引用的接口 operationId 是否仍然存在** | 扫描 design.md 中的 `{METHOD} {path}`，比对 OpenAPI |

输出示例：

```
📋 设计文档自检报告
✅ 通过: 5 项
⚠️  建议: 2 项
  - 4.2.3 /api/users/:id POST 接口在 openapi.yaml 中已不存在（可能被删除或重命名）
  - 章节 5.2 "MVP 取舍" 未写理由
❌ 未通过: 0 项
```

---

## 与其他 skill 的联动

| skill | 联动方式 |
|-------|---------|
| `spec-api-sync` | 已消费同一个 openapi.yaml，两个 skill 视图一致（契约真源） |
| `spec-req-gen` | **强联动**：spec-req-gen 运行前检测 design.md 存在则作为**补充输入**给 brainstorming |
| `spec-req-exec` | 间接通过 plan.md 使用；不直接读 design.md |
| `feat-design` | 平行关系，**共享模板 `templates/design-template.md`** |

---

## 注意事项

- **分支解析对齐 spec 系列**：feat/xxx → xxx；非 feat 分支用完整名。用户可手动指定 branchKey
- **OpenAPI 是契约真源**：设计文档的 4.2 章节**不要手动编辑接口字段**，改动走 openapi.yaml → 重新运行 spec-design update
- **不强制评审状态机**：与 feat-design 一致，评审通过与否由团队线下确认
- **模板共享 feat-design**：两个 skill 共用 `templates/design-template.md`，保证写作规范一致

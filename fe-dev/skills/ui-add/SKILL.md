---
name: ui-add
description: 分析 MasterGo 设计稿，生成设计规格文档。触发词: "ui add", "添加设计稿", "设计分析", "ui-add"
allowed-tools: Read, Grep, Glob, Bash
---

# UI Add - 设计稿分析

分析 MasterGo 设计稿，提取设计信息，生成结构化的 design-spec.md。

> 共享工具: `<skill-path>/references/ui-utils.md`
> **语言要求**：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

### 步骤 1: 获取 feat 名称

```bash
git branch --show-current
```

不以 `feat/` 开头则提示用户切换到功能分支。

### 步骤 2: 解析参数

| 参数 | 必填 | 说明 |
|------|------|------|
| url | 是 | MasterGo 设计稿 URL（短链或文件链接） |
| name | 是 | 页面标识名（kebab-case，如 `login`、`user-list`） |
| target | 否 | 目标 .vue 文件路径（如 `pages/login/index.vue`），不填则根据 name 推断 |

**参数校验**：如果 `name` 缺失，**立即**使用 AskUserQuestion 询问用户，不进入后续步骤。

> **⚠️ 重要**：步骤 3（初始化 UI 目录）必须在步骤 4（获取设计数据）之前执行，确保目录结构就绪后再请求数据。

### 步骤 3: 初始化 UI 目录

检查 `{UI_DIR}/ui-pages.json` 是否存在：

- 存在 → 读取现有内容
- 不存在 → 从 `<skill-path>/templates/ui-pages.json` 创建，同步创建 `specs/` 子目录

### 步骤 4: 获取设计数据

按优先级尝试，取第一个成功的：

**4a. 尝试 getD2c**

```
mcp__mastergo__mcp__getD2c(contentId, documentId)
```

从 URL 提取参数：
- 短链 `https://mastergo.iflytek.com/goto/XXXXX` → contentId = XXXXX, documentId = XXXXX
- 文件链 `https://mastergo.iflytek.com/file/{fileId}?layer_id={layerId}` → 从 D2C URL 提取

成功 → 使用返回的 `code` 字段作为代码参考，跳到步骤 5。

**URL 编码重试**：如果 MCP 调用返回空或失败，且 `layerId` / `contentId` 包含 `:` 等特殊字符，使用 URL 编码后的值（如 `%3A`）重试一次。

**4b. 尝试 getDsl**

```
mcp__mastergo__mcp__getDsl(shortLink: url)
```

成功 → 获取 DSL 节点树，跳到步骤 5。

**URL 编码重试**：同 4a，如果失败且 URL 参数包含特殊字符，尝试 URL 编码后重试。

**4c. 两者均失败**

输出错误信息并退出：

```
❌ 无法获取设计稿数据。请检查：
- URL 是否正确
- 是否有 MasterGo 访问权限
- MCP 服务是否正常运行
```

### 步骤 5: 分析设计数据

AI 分析获取到的设计数据（D2C 代码或 DSL 节点树），提取以下信息：

**5a. 提取语义 Design Tokens**

按三层分组：

| 层级 | 说明 | 示例 |
|------|------|------|
| Element Plus 主题 | 映射到 `--el-*` 变量 | `--el-color-primary: #02B3D6` |
| Tailwind 扩展 | 映射到 tailwind.config | `colors.brand: #02B3D6` |
| Scoped SCSS | 页面级装饰性值 | `--shadow-card: 0px 20px...` |

注意：提取的是**语义 tokens**（品牌色、背景色、圆角等），不是原始 DSL 节点值。

**5b. 识别布局结构**

描述页面整体布局：
- 分栏方式（左右/上下/嵌套）
- 各区域占比和内容
- 响应式行为（如有）

**5c. 映射组件**

将设计稿中的 UI 元素映射到 Element Plus 组件，同时提取影响布局的关键属性：

- 输入框 → ElInput
- 下拉选择 → ElSelect
- 按钮 → ElButton
- 表格 → ElTable
- 弹窗 → ElDialog
- 等等（详见 ui-utils.md 组件映射表）

同时标注每个组件区域应使用的 Tailwind class。

需提取的 EP 属性（按组件类型）：

| 组件 | 需提取的属性 | 像素值映射规则 |
|------|------------|-------------|
| ElForm | `label-position`, `label-width`, `inline` | label 与 input 上下排列 → `label-position="top"` |
| ElButton | `type`, `size`, `plain`, `round`, `loading` | 高度 ≥36→`large`, 28-35→`default`, ≤27→`small`；border-radius ≥ 高度/2 → `round` |
| ElDialog | `width`, `fullscreen`, `title` | frame 宽度直接取 px 值，如 `width="520px"` |
| ElInput | `size`, `clearable`, `show-password`, `type` | 高度同 Button 映射；高度 >60px → `type="textarea"` |
| ElSelect | `size`, `clearable`, `multiple`, `filterable` | 高度同 Button 映射 |
| ElTable | `border`, `stripe`, `size` | 有边框线 → `border`；交替行背景色不同 → `stripe` |
| ElDatePicker | `type`, `size`, `clearable` | 高度同 Button 映射 |
| ElPagination | `background`, `small` | - |
| ElSwitch | `size` | 高度 ≥28→`large`, 20-27→`default`（ElSwitch 无 small） |
| ElRadio / ElCheckbox | `size` | 高度同 Button 映射 |

属性提取规则：
- 只在设计稿中能明确判断时才记录，无法判断的属性不填写（使用 Element Plus 默认值）
- 尺寸属性优先从 DSL 节点的 `height` / `bounds.height` 中读取像素值进行映射

**5d. 提取字段和校验规则**

从表单类组件中提取：
- 字段名、类型
- 对应的 Element Plus 组件
- 校验规则（required、min/max、pattern 等）
- 尝试关联项目中的 TypeScript 类型

**5e. 描述交互行为**

从按钮、链接等可交互元素中提取：
- 触发条件
- 执行动作（提交、跳转、弹窗等）
- 预期关联的 service 方法

### 步骤 6: 自动发现项目上下文

**6a. 发现 Types**

根据步骤 5d 提取的字段名，在项目中搜索匹配的 TypeScript 类型：

```bash
# 搜索 interface 和 type 定义
grep -rn "interface\|type" app/types/ --include="*.ts"
```

将匹配到的类型记录到 spec 的"项目上下文"部分。

**6b. 发现 Services**

根据步骤 5e 的交互描述，搜索匹配的 composable：

```bash
# 搜索 useXxxService
grep -rn "use.*Service" app/composables/ --include="*.ts"
```

**6c. 查找参考页面**

如果 target 指向的 .vue 文件已存在，将其作为参考页面记录到 spec 中。

### 步骤 7: 生成 design-spec.md

基于模板 `<skill-path>/templates/design-spec.md`，填充步骤 5-6 的分析结果，写入：

```
{UI_DIR}/specs/{pageId}-spec.md
```

### 步骤 8: 更新 ui-pages.json

在 `pages` 数组中添加新条目：

```json
{
  "id": "{pageId}",
  "name": "{name}",
  "mastergo": "{url}",
  "target": "{targetPath}",
  "status": "spec-done",
  "createdAt": "{当前时间}",
  "updatedAt": "{当前时间}",
  "tokens": {
    "element-plus": { ... },
    "tailwind": { ... },
    "scoped": { ... }
  }
}
```

如果 pageId 已存在且状态为 `converted`，提示用户是否要覆盖（会重置为 spec-done）。

### 步骤 9: 输出摘要

```
✅ 设计规格已生成
📄 Spec: {UI_DIR}/specs/{pageId}-spec.md
📋 页面注册表: {UI_DIR}/ui-pages.json
🎨 提取 tokens: EP({n}) + Tailwind({n}) + SCSS({n})
🔗 发现 types: {列表}
🔗 发现 services: {列表}

请审查 spec 文件，确认后执行 /fe-dev:ui-gen 生成代码。
```

> **完整流程**：`/fe-dev:ui-add` → `/fe-dev:ui-gen` → `/fe-dev:ui-check`
```

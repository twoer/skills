# UI Skill 共享工具

所有 `fe-dev:ui*` skill 共用的工具函数和约定。

---

## 路径约定

### getUIDir

构造 UI 目录路径。

```bash
docs/features/feat-{featName}/ui/
```

### 路径常量

```
UI_DIR      = {UI_BASE}/
PAGES_JSON  = {UI_BASE}/ui-pages.json
SPECS_DIR   = {UI_BASE}/specs/
```

### specPath

构造 spec 文件路径。

```
{SPECS_DIR}/{pageId}-spec.md
```

---

## 状态枚举

```typescript
type PageStatus = "pending" | "spec-done" | "converted" | "reviewed"
```

状态流转：`pending` → `spec-done` → `converted` → `reviewed`

| 状态 | 含义 | 触发命令 |
|------|------|---------|
| pending | 已注册，未分析 | ui-add 创建条目时 |
| spec-done | spec 已生成，待确认 | ui-add 完成时 |
| converted | 代码已生成 | ui-gen 完成时 |
| reviewed | 质检通过 | ui check 通过时 |

---

## ui-pages.json 操作

### initPagesJson

如果 `ui-pages.json` 不存在，从 `<skill-path>/templates/ui-pages.json` 创建初始文件。

### getPage

按 `pageId` 在 `pages` 数组中查找页面记录。

### updatePageStatus

更新指定页面的 `status` 和 `updatedAt` 字段。

### addPage

添加新页面条目：

```json
{
  "id": "{pageId}",
  "name": "{name}",
  "mastergo": "{url}",
  "target": "{targetPath}",
  "status": "spec-done",
  "createdAt": "{ISO date}",
  "updatedAt": "{ISO date}",
  "tokens": {
    "element-plus": {},
    "scoped": {}
  }
}
```

---

## MCP 调用约定

### 设计稿获取策略

**仅 MasterGo，两步降级，无图片分析兜底。**

```
1. 尝试 getD2c（最佳，直接生成代码）
   - 工具：mcp__mastergo__mcp__getD2c
   - 参数：contentId, documentId（从 URL 提取）
   - 成功 → 使用返回的 code 字段
   - 失败且参数含特殊字符（如 `:`）→ URL 编码后重试一次

2. 尝试 getDsl（结构化节点树）
   - 工具：mcp__mastergo__mcp__getDsl
   - 参数：shortLink（直接传入 URL）
   - 成功 → AI 分析 DSL 节点树
   - 失败且 URL 含特殊字符 → URL 编码后重试一次

3. 两者均失败 → 报错退出，提示用户检查 URL 或网络
```

### URL 编码重试

当 MCP 调用返回空或报错时，检查参数中是否包含 `:` 等特殊字符（常见于 MasterGo 的 `layer_id`），如果有，将特殊字符替换为 URL 编码（如 `:` → `%3A`）后重试一次。

### URL 解析

- 短链格式：`https://mastergo.iflytek.com/goto/RuscHDVn`
- 文件格式：`https://mastergo.iflytek.com/file/{fileId}?layer_id={layerId}`
- contentId 从短链路径或 D2C URL 中提取

### 预留扩展

未来非 MasterGo 来源可使用图片分析：
- 工具：`mcp__4_5v_mcp__analyze_image`
- 条件：`source != "mastergo"`

---

## 代码生成规则

### 样式优先级（从高到低）

1. **Element Plus 组件** — 优先使用 EP 内置组件
2. **Tailwind CSS class** — 布局、间距、响应式、文字
3. **Scoped SCSS** — 仅用于 `:deep()` 覆盖和装饰性样式
4. **禁止** — 内联 style、全局 SCSS、!important

### Element Plus 组件映射

| 场景 | 组件 |
|------|------|
| 表单 | ElForm, ElFormItem, ElInput, ElSelect, ElDatePicker, ElRadio, ElCheckbox, ElSwitch, ElUpload |
| 数据展示 | ElTable, ElTableColumn, ElPagination, ElDescriptions, ElStatistic |
| 反馈 | ElDialog, ElMessageBox, ElMessage, ElNotification, ElDrawer |
| 导航 | ElMenu, ElMenuItem, ElBreadcrumb, ElTabs, ElTabPane, ElDropdown |
| 通用 | ElButton, ElCard, ElTag, ElBadge, ElTooltip, ElAvatar, ElDivider, ElEmpty, ElSkeleton |

### EP 组件文本换行覆盖清单

部分 Element Plus 组件内部默认设置 `white-space: nowrap`，会阻止文本自然换行。当 DSL 或 spec 表明这些组件内的文本需要换行时，必须通过 `:deep()` 覆盖。

| 组件 | 需覆盖的内部选择器 | 典型场景 |
|------|-----------------|---------|
| ElCheckbox | `.el-checkbox__label` | 协议勾选文案（如"我已阅读并同意《隐私政策》..."） |
| ElRadio | `.el-radio__label` | 长选项文案 |
| ElButton | `.el-button` | 按钮内长文本（少见但可能） |
| ElTag | `.el-tag` | 标签内长内容 |
| ElBreadcrumbItem | `.el-breadcrumb__inner` | 长面包屑文本 |
| ElStep | `.el-step__title` | 步骤条长标题 |

**覆盖写法（Scoped SCSS）：**

```scss
// 以 ElCheckbox 为例
.agreement-checkbox {
  :deep(.el-checkbox__label) {
    white-space: normal;
  }
}
```

> **使用条件**：仅在文本内容较长、设计稿中明确换行时才覆盖。短文本场景（如单个按钮词）应保持 EP 默认的 nowrap 行为。

### Tailwind 常用 class

| 用途 | class |
|------|-------|
| 布局 | flex, grid, gap-*, items-center, justify-between |
| 间距 | p-*, m-*, space-x-*, space-y-* |
| 尺寸 | w-*, h-*, min-h-screen, max-w-* |
| 响应式 | sm:, md:, lg:, xl: |
| 文字 | text-*, font-*, leading-*, tracking-* |
| 显示 | hidden, block, flex, grid |
| 圆角 | rounded, rounded-lg, rounded-xl, rounded-2xl |
| 阴影 | shadow, shadow-sm, shadow-md, shadow-lg |

### CSS → Tailwind 映射

从 MasterGo DSL 提取的 CSS 属性转换为 Tailwind class 的规则。

能匹配 Tailwind 预设值的用预设 class，不能匹配的用方括号语法（如 `w-[380px]`）。

**布局**

| CSS 属性 | Tailwind class |
|---------|---------------|
| `display: flex` | `flex` |
| `flex-direction: column` | `flex-col` |
| `flex-direction: row` | `flex-row` |
| `flex-wrap: wrap` | `flex-wrap` |
| `flex-wrap: nowrap` | `flex-nowrap` |
| `gap: {n}px` | `gap-{n/4}`（Tailwind 间距单位 = 4px：4→`gap-1`, 8→`gap-2`, 12→`gap-3`, 16→`gap-4`, 20→`gap-5`, 24→`gap-6`, 32→`gap-8`） |
| `justify-content: center` | `justify-center` |
| `justify-content: space-between` | `justify-between` |
| `justify-content: flex-end` | `justify-end` |
| `align-items: center` | `items-center` |
| `align-items: flex-start` | `items-start` |
| `align-items: flex-end` | `items-end` |

**尺寸**

| CSS 属性 | Tailwind class |
|---------|---------------|
| `width: {n}px` | `w-[{n}px]`（匹配预设则用 `w-full`, `w-1/2` 等） |
| `height: {n}px` | `h-[{n}px]`（匹配预设则用 `h-full`, `h-screen` 等） |
| `min-width: {n}px` | `min-w-[{n}px]` |
| `max-width: {n}px` | `max-w-[{n}px]` |
| `min-height: {n}px` | `min-h-[{n}px]` |

**间距**

| CSS 属性 | Tailwind class |
|---------|---------------|
| `padding: {n}px` | `p-[{n}px]`（匹配预设则用 `p-4`, `px-6` 等） |
| `margin: {n}px` | `m-[{n}px]`（匹配预设则用 `m-4`, `mx-auto` 等） |

**排版**

| CSS 属性 | Tailwind class |
|---------|---------------|
| `font-size: 12px` | `text-xs` |
| `font-size: 14px` | `text-sm` |
| `font-size: 16px` | `text-base` |
| `font-size: 18px` | `text-lg` |
| `font-size: 20px` | `text-xl` |
| `font-size: 24px` | `text-2xl` |
| `font-size: {n}px`（非预设） | `text-[{n}px]` |
| `line-height: 1.5` | `leading-normal` |
| `line-height: 1.75` | `leading-relaxed` |
| `font-weight: 400` | `font-normal` |
| `font-weight: 500` | `font-medium` |
| `font-weight: 600` | `font-semibold` |
| `font-weight: 700` | `font-bold` |
| `text-align: center` | `text-center` |
| `text-align: right` | `text-right` |

**文本控制**

| CSS 属性 | Tailwind class |
|---------|---------------|
| `overflow-wrap: break-word` | `break-words` |
| `word-break: break-all` | `break-all` |
| `white-space: nowrap` | `whitespace-nowrap` |
| `white-space: pre` | `whitespace-pre` |
| `text-overflow: ellipsis` | `truncate`（需配合 `overflow-hidden whitespace-nowrap`） |

**textMode（DSL 文本模式 → CSS 映射）**

MasterGo DSL 的 TEXT 节点通过 `textMode` 字段声明文本行为：

| DSL textMode | CSS 属性 | Tailwind class |
|-------------|---------|---------------|
| `"single-line"` | `white-space: nowrap` | `whitespace-nowrap` |
| `"multi-line"` 或缺失 | `white-space: normal; overflow-wrap: break-word` | `break-words` |

> **推断规则**：当容器有 `flexContainerInfo` + 宽度约束（`width`/`max-width`），且子 TEXT 节点的 `textMode` 不是 `"single-line"` 时，即使 DSL 未显式记录，也应为文本节点推断 `overflow-wrap: break-word`（`break-words`）。这是 Auto Layout → CSS Flex 的通用映射，不限于特定组件。

**溢出**

| CSS 属性 | Tailwind class |
|---------|---------------|
| `overflow: hidden` | `overflow-hidden` |
| `overflow: auto` | `overflow-auto` |
| `overflow: scroll` | `overflow-scroll` |

**视觉**

| CSS 属性 | Tailwind class |
|---------|---------------|
| `border-radius: 4px` | `rounded` |
| `border-radius: 8px` | `rounded-lg` |
| `border-radius: 12px` | `rounded-xl` |
| `border-radius: 16px` | `rounded-2xl` |
| `border-radius: 9999px` | `rounded-full` |
| `border-radius: {n}px`（非预设） | `rounded-[{n}px]` |
| `cursor: pointer` | `cursor-pointer` |
| `opacity: 0.5` | `opacity-50` |

### Scoped SCSS 允许场景

- Element Plus 组件样式覆盖（**必须**使用 `:deep()`）
- 装饰性样式（渐变背景、模糊效果、动画 keyframes）
- CSS 变量定义（`--shadow-card`、`--blur-deco` 等）

---

## 质检规则

### 核心规则（error 级别）

- 无内联 `style="..."` 属性
- `<style>` 标签必须有 `scoped` 属性
- 表单字段必须有 `label` 或 `aria-label`
- 禁止硬编码负像素边距（如 `mt-[-540px]`、`ml-[-100px]`）— 覆盖层应使用 `absolute`/`relative` 定位，负边距 hack 说明布局结构理解有误

### 交互规则（warning 级别）

- 可点击元素（`<a>`、`<button>`、有 `@click` 的元素）应有 `cursor-pointer` class
- hover 状态应有 `transition`（150-300ms）
- 颜色变化应有 `transition: color 200ms` 而非 `transition: all`

### 可访问性（warning 级别）

- 文字对比度 >= 4.5:1
- `<img>` 必须有 `alt` 属性
- `focus` 状态可见

### 布局还原规则（warning 级别）

- flex 容器内含文本的子项，应有 `min-w-0`（防 flex 子项溢出）
- 宽度约束容器内的文本元素，应有 `break-words`（确保文本换行）
- 仅当 `textMode: "single-line"` 或显式 `whitespace-nowrap` 时允许文本不换行

### 项目规则（info 级别）

- 优先使用 Element Plus 组件而非手动实现
- Tailwind class 优先于 SCSS
- scoped SCSS 中无全局样式泄漏（无未加前缀的选择器）

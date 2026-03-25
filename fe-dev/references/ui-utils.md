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

## MasterGo API 调用约定

### 前置条件

在调用 API 之前，必须先运行 `/fe-dev:ui-setup` 配置 PAT。

配置文件路径：`<skill-path>/config/mastergo.json`

```json
{
  "pat": "mg_...",
  "base_url": "https://mastergo.iflytek.com"
}
```

### getMastergoConfig

读取配置文件。如果文件不存在或 `pat` 为空，提示用户先运行 `/fe-dev:ui-setup`。

### 设计稿获取策略

**仅使用 DSL 端点，curl 直接保存为中间文件，后续流程读取本地文件，不重复请求。**

```
1. 解析 URL（提取 fileId + layerId）
2. curl 调用 DSL API，直接保存到 {UI_DIR}/specs/{pageId}-dsl-raw.json
3. 读取 dsl_raw.json 进行分析
4. ui-gen 等后续流程直接读取已有 dsl_raw.json，不再调用 API
```

### fetchDsl

调用 MasterGo DSL API，**直接写入文件**（避免大响应撑爆 Bash 输出）：

```bash
curl -s -o {output_path} \
  -H "X-MG-UserAccessToken: {pat}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "{base_url}/mcp/dsl?fileId={fileId}&layerId={layerId}"
```

**参数说明**：
- `pat`: 从 `config/mastergo.json` 读取
- `base_url`: 从 `config/mastergo.json` 读取
- `fileId`: 从文件链接 URL 中提取
- `layerId`: 从文件链接 URL 中提取（需 URL decode，如果含 `/` 只取首段）

**错误处理**：

| HTTP 状态码 | 含义 | 处理方式 |
|-------------|------|---------|
| 200 | 成功 | 读取 dsl_raw.json 继续 |
| 401 / 403 | PAT 无效或过期 | 提示用户重新运行 `/fe-dev:ui-setup` |
| 404 | fileId/layerId 不存在 | 提示用户检查 URL |
| 500 | 服务端错误 | 提示稍后重试 |

### URL 解析

**文件链接**（推荐）：
```
https://mastergo.iflytek.com/file/{fileId}?layer_id={layerId}
```
- fileId: 正则 `/file/([^/?]+)` 提取
- layerId: 从 `layer_id` 参数获取，需 URL decode；如果 decode 后含 `/`（复合路径），只取 `/` 前的部分

**短链**：
```
https://mastergo.iflytek.com/goto/XXXXX
```
- 短链处理策略：
  1. 通过 HTTP redirect 解析（**注意：不能带 PAT header，否则返回 404**）：
     ```bash
     # 获取 redirect URL（不带任何认证 header）
     REDIRECT_URL=$(curl -s -o /dev/null -w "%{redirect_url}" "https://mastergo.iflytek.com/goto/XXXXX")
     # 提取 fileId
     FILE_ID=$(echo "$REDIRECT_URL" | sed -n 's|.*/file/\([^/?]*\).*|\1|p')
     # 提取 layerId（需 URL decode）
     LAYER_ID_RAW=$(echo "$REDIRECT_URL" | sed -n 's|.*layer_id=\([^&]*\).*|\1|p')
     LAYER_ID=$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1]))" "$LAYER_ID_RAW")
     ```
  2. 如果 redirect URL 为空或未解析到 fileId/layerId，报错提示用户使用文件链接

> **推荐**：优先使用文件链接（含 `layer_id`），只返回目标页面的节点树，避免数据过大。

### saveDslRaw

将 DSL 响应保存到中间文件：

```
路径: {UI_DIR}/specs/{pageId}-dsl-raw.json
```

由 ui-add 创建，ui-gen/ui-update 直接读取，不重复请求。

### readDslRaw

读取已有的 dsl_raw.json 文件。如果文件不存在，提示用户先运行 `/fe-dev:ui-add`。

### 预留扩展

未来非 MasterGo 来源可使用图片分析：
- 工具：`mcp__4_5v_mcp__analyze_image`
- 条件：`source != "mastergo"`

---

## 代码生成规则

### 样式优先级（从高到低）

1. **Element Plus 组件** — 优先使用 EP 内置组件
2. **Tailwind CSS class** — 布局、间距、尺寸、响应式、文字，**必须写在 `<template>` 元素的 class 属性上**
3. **Scoped SCSS** — 仅用于 `:deep()` 覆盖和装饰性样式。如需在 `<style>` 中使用 Tailwind，必须用 `@apply`
4. **禁止** — 内联 style、全局 SCSS、!important、`<style>` 块中裸写 Tailwind class

### 图标/SVG 引用规则

1. **优先使用设计稿资源** — 如果步骤 5 成功提取了图片/SVG 资源，必须使用该资源
2. **nuxt-svgo 项目** — SVG 图标使用自动导入组件方式（如 `<ICommonLogo />`），目录为 `app/assets/icons/svgs/{分类}/`
3. **非 nuxt-svgo 项目** — SVG 降级为图片引用（`./assets/images/xxx.svg`）
4. **禁止用 EP 图标替代设计稿自定义图标/Logo** — 仅当资源提取失败时才允许临时替代，且必须记入 TODO list

### DSL 特殊节点解析规则

#### PATH 节点 border-radius 提取

MasterGo 将圆角矩形导出为 PATH 节点时，圆角值编码在 SVG path data 中：

- **模式**：`M{radius} {y} L{width-radius} {y} C{width-k} {y} {width} {k} {width} {radius}...`
- **提取规则**：path data 中 `M` 后的第一个数字即为圆角半径（px）
- **适用条件**：PATH 节点名称含"背景"、"模块"、"card"、"容器"等语义，且节点无直接 `borderRadius` CSS 属性
- **示例**：`M8 0 L272 0 C276.418 0 280 3.58172 280 8...` → radius = 8px

#### Effect/Shadow 引用解析

DSL 中的阴影效果使用间接引用：

1. 节点的 `effect` 字段存储 token key（如 `"effect_2:06660"`）
2. 实际 CSS 值在 `styles["effect_2:06660"].value` 中（数组格式）
3. 空数组 `[]` = 无阴影；非空数组 = 提取 `box-shadow` 值
4. **禁止跨节点借用** — 每个节点必须使用自身的 effect 引用

#### SVG_ELLIPSE 颜色解析

SVG_ELLIPSE 节点的 `fill` 通常是样式引用而非直接颜色值：

1. 读取 `fill` 字段（如 `"paint_0:0311"`）
2. 在 `styles["paint_0:0311"].value` 中查找实际颜色
3. `value` 是颜色字符串数组，取第一个非空值

### Element Plus 组件映射

| 场景 | 组件 |
|------|------|
| 表单 | ElForm, ElFormItem, ElInput, ElSelect, ElDatePicker, ElRadio, ElCheckbox, ElSwitch, ElUpload |
| 数据展示 | ElTable, ElTableColumn, ElPagination, ElDescriptions, ElStatistic |
| 反馈 | ElDialog, ElMessageBox, ElMessage, ElNotification, ElDrawer |
| 导航 | ElMenu, ElMenuItem, ElBreadcrumb, ElTabs, ElTabPane, ElDropdown |
| 通用 | ElButton, ElCard, ElTag, ElBadge, ElTooltip, ElAvatar, ElDivider, ElEmpty, ElSkeleton |

### ElTableColumn 对齐规则

生成 `<el-table-column>` 时，根据列的字段名或表头文字自动推断 `align` 属性：

| 列数据类型 | 推断条件 | `align` 值 |
|-----------|---------|-----------|
| 数字 / 金额 | 字段名含 `amount`、`price`、`fee`、`count`、`num`、`total`、`qty`、`money`；或表头含"金额"、"数量"、"价格"、"费用"、"合计" | `right` |
| 日期 / 时间 | 字段名含 `date`、`time`、`at`（如 `createdAt`）；或表头含"日期"、"时间" | `center` |
| 枚举 / 状态 | 字段名含 `status`、`type`、`state`、`level`；或表头含"状态"、"类型"、"等级" | `center` |
| 操作列 | 表头为"操作"、"Action"、"action" | `center` |
| 其他（文本、ID 等） | 默认 | 不设置（EP 默认左对齐） |

**示例：**

```vue
<el-table-column prop="createdAt" label="创建时间" align="center" />
<el-table-column prop="amount" label="金额" align="right" />
<el-table-column prop="status" label="状态" align="center" />
<el-table-column label="操作" align="center" />
```

> spec 中如果已明确记录 `align`，以 spec 为准；未记录时按此规则推断。

### EP 组件默认属性规则

以下属性作为**默认行为**，生成代码时自动添加，无需设计稿明确标注：

| 组件 | 默认属性 | 说明 |
|------|---------|------|
| ElInput | `clearable` | 支持用户一键清空输入内容 |
| ElSelect | `clearable` | 支持用户一键清空选择 |
| ElSelect | `filterable` | 支持用户搜索选项 |
| ElDatePicker | `clearable` | 支持用户一键清空日期 |

> **注意**：仅在属性提取规则表中明确标注了这些属性时才添加。设计稿中能明确判断为"不可清空"或"不可搜索"的场景除外。

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
- Tailwind class **必须写在 `<template>` 元素的 class 属性上**，禁止直接裸写在 `<style>` 块中（如 `min-w-0;`）。如需在 `<style>` 中使用 Tailwind，必须用 `@apply`（如 `@apply min-w-0;`）

### 交互规则（warning 级别）

- 可点击元素（`<a>`、`<button>`、有 `@click` 的元素）应有 `cursor-pointer` class
- hover 状态应有 `transition`（150-300ms）
- 颜色变化应有 `transition: color 200ms` 而非 `transition: all`
- 有 `transition` 的可点击元素**必须配对 `hover:` 效果**（如 `hover:opacity-80`、`hover:underline`），否则 transition 无实际作用

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

### 资源引用规则（warning 级别）

- 禁止用 EP 图标组件（如 `<DataAnalysis />`、`<Search />`）替代设计稿中的自定义图标/Logo，除非设计稿中没有对应的矢量资源
- 如果 spec 资源清单中有对应条目但代码中使用了 EP 图标替代 → warning，提示应使用已提取的资源
- 如果代码中使用了 EP 图标替代且 spec 资源清单中没有对应条目 → info，说明可能是合理替代

**EP 图标替代检测方式**（ui-check 步骤 3 执行）：

1. **扫描 EP 图标引用**：在 .vue 文件中扫描 EP 图标组件的使用模式：
   - `<el-icon>` 标签内的子组件（如 `<DataAnalysis />`、`<Search />`）
   - 带 `el-icon` class 或通过 `ElIcon` 包裹的节点
   - 通过 `import { DataAnalysis } from '@element-plus/icons-vue'` 导入的图标
2. **匹配 spec 资源清单**：对每个 EP 图标引用，与 spec"资源清单"表格中的条目做**语义名模糊匹配**：
   - EP 图标组件名（PascalCase）→ 转为 kebab-case → 与资源清单"语义名"字段做模糊对比（包含关键词即匹配）
   - 示例：`<DataAnalysis />` → `data-analysis` → 匹配资源清单中名为 `DataAnalysisIcon`、`StatsDataAnalysis` 的条目
3. **判断结果**：
   - 匹配到资源清单条目 → **warning**：`{行号} 使用了 EP 图标 <{ComponentName}> 替代，资源清单中有对应条目 "{语义名}"，应使用已提取的资源`
   - 未匹配到资源清单条目 → **info**：`{行号} 使用了 EP 图标 <{ComponentName}>，spec 资源清单中无对应条目，可能是合理替代`

### EP 组件默认属性检查（warning 级别）

- ElInput 缺少 `clearable` → 提示添加
- ElSelect 缺少 `clearable` 或 `filterable` → 提示添加
- ElDatePicker 缺少 `clearable` → 提示添加
- ElTableColumn 数字/金额列未设置 `align="right"` → 提示添加
- ElTableColumn 日期/时间/枚举/状态/操作列未设置 `align="center"` → 提示添加

### Design-spec 完整性检查（info 级别）

- design-spec 无"业务需求"章节 → info："建议运行 `/fe-dev:spec req-gen` 生成需求分析，提升代码业务逻辑覆盖率"
- "业务需求"章节有内容，但"字段映射"表中的表单字段在"校验规则"表中无对应条目 → info："字段 {字段名} 未定义校验规则，建议补充"

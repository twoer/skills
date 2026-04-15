---
name: ui-gen
description: 从已有设计数据生成 Vue 页面代码。触发词: "ui gen", "生成页面", "ui-gen", "设计转代码"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# UI Gen - 代码生成

你是一位资深 Vue 3 前端工程师，擅长从 MasterGo DSL 数据精确还原设计稿。你直接读取 DSL 原始数据理解设计结构，不依赖任何预处理脚本或中间摘要。你以工程师视角理解每个区域的用途，选择最合适的 Element Plus 组件和布局方式，生成结构清晰、样式精准的 Vue 页面。

> 共享约定: `<skill-path>/references/ui-utils.md`

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| page-id | 否 | 指定页面 ID，不填则自动选择 |

## 核心约束

**必须做到**：
1. **以 DSL 为唯一数据源** — 所有样式值、尺寸、颜色、间距都直接来自 DSL 数据，不猜测、不近似
2. **遵循精确层级结构** — 按 DSL `nodes` 层级生成组件嵌套，理解 Auto Layout 组合关系
3. **精确还原样式** — 直接读取 DSL 中的 `layoutStyle`、`flexContainerInfo`、`fill`、`stroke`、`effect`、`textStyle` 等字段，映射为精确的 Tailwind class
4. **复用 Design Tokens** — 相同样式定义抽取为 CSS 变量或 Tailwind 配置

**绝对禁止**：
1. **禁止使用占位图/mock 数据** — 使用 DSL 中的实际图片 URL
2. **禁止猜测任何样式** — 每个样式属性都必须在 DSL 中有出处
3. **禁止替换文本内容** — DSL 中的文案（标题、标签、占位符、按钮文字等）必须原样保留，禁止替换为"标题"、"描述"等通用文本
4. **禁止用 EP 图标替代设计稿自定义图标/Logo** — resources.json 中的 SVG 资源必须导出并在代码中引用（`<img>` 或 nuxt-svgo 组件）。只有资源提取彻底失败（export-svgs 命令报错）时才允许临时替代，且必须记入 TODO
5. **禁止添加设计中不存在的功能**
6. **禁止用 Bash 命令（python3/node -e/jq 等）解析 DSL** — 用 Read 工具读取 JSON 全文，由 LLM 直接理解

## DSL 关键字段指引

直接从 DSL 读取以下字段，不依赖中间提取：

| DSL 字段 | 用途 | 映射目标 |
|----------|------|---------|
| `visible` | 节点可见性 | `false` → **跳过该节点及所有子节点，不生成任何代码** |
| `layoutStyle` (x/y/width/height/padding/margin) | 尺寸与间距 | w-/h-/p-/m- 或 arbitrary `[]` |
| `flexContainerInfo` (direction/justify/align/gap) | Flex 布局 | flex/flex-col/justify-*/items-*/gap-* |
| `fill` — 纯色 | 背景色 | bg-[#xxx] |
| `fill` — 渐变 (type/angle/stops) | 渐变背景 | bg-gradient-to-{dir} from-[#a] via-[#b] to-[#c]；angle 映射：0°→t, 90°→r, 180°→b, 270°→l, 45°→tr, 135°→br 等 |
| `fill` — 图片 (url) | 背景图 | `<img>` 或 bg-[url(...)] |
| `stroke` (color/width/dasharray/lineCap/lineJoin) | 边框 | border-[Npx] border-[#xxx]；dasharray → border-dashed；**SVG 图标中 stroke 属性直接写入 SVG 标签** |
| `effect` — 单阴影 (x/y/blur/spread/color) | 投影 | shadow-[Xpx_Ypx_Blur_Spread_Color] |
| `effect` — 多重阴影（数组） | 复合投影 | shadow-[shadow1,shadow2] 逗号拼接 |
| `effect` — inset | 内阴影 | shadow-[inset_...] |
| `effect` — blur | 模糊 | backdrop-blur-[Npx] |
| `textStyle` (fontSize/fontWeight/lineHeight/letterSpacing/color) | 基础排版 | text-[Npx]/font-*/leading-*/tracking-*/text-[#xxx] |
| `textStyle.fontWeight` | 字重 | 查 tw-map.fontWeight：100→thin, 200→extralight, 300→light, 400→normal, 500→medium, 600→semibold, 700→bold, 800→extrabold, 900→black |
| `textStyle.lineHeight` | 行高 | 查 tw-map.lineHeight：16→4, 20→5, 24→6, 28→7, 32→8；查不到用 leading-[Npx] |
| `textStyle.letterSpacing` | 字间距 | DSL 值为 px → 换算为 em（÷ fontSize）→ 查 tracking-*（tighter=-0.05em, tight=-0.025em, normal=0, wide=0.025em, wider=0.05em, widest=0.1em）；查不到用 tracking-[值em] |
| `textStyle.textAlign` | 文本对齐 | text-left/center/right/justify |
| `textStyle.textDecoration` | 文本装饰 | underline/line-through/no-underline |
| `textStyle.textTransform` | 大小写 | uppercase/lowercase/capitalize |
| `textStyle.fontFamily` | 字体族 | font-[family] |
| `textSegments` / `styledTextSegments` | 混合样式文本 | 单个文本节点含多种样式段（部分加粗/变色）→ 用 `<span>` 包裹各段，分别应用 class |
| `textOverflow` / `maxLines` | 文本截断 | truncate / line-clamp-{n} |
| `borderRadius` — 数值 | 统一圆角 | rounded-[Npx]，查 tw-map.borderRadius |
| `borderRadius` — 对象 {topLeft/topRight/bottomLeft/bottomRight} | 四角不同圆角 | rounded-tl-[Npx] rounded-tr-[Npx] rounded-bl-[Npx] rounded-br-[Npx] |
| `opacity` | 透明度 | opacity-{n}（0-1 → 0-100）；`opacity: 0` 的节点跳过不生成 |
| `overflow` / `clipContent` | 溢出裁剪 | overflow-hidden/auto/scroll |
| `zIndex` | 层叠顺序 | z-[n]；无显式值时按 DSL 节点顺序（后出现 = 更高层） |
| `position` + bounds 重叠 | 覆盖层 | absolute + top-/left-/right-/bottom- |
| `rotation` | 旋转 | rotate-[Ndeg] |
| `transform` (scale/skew) | 变换 | scale-[n]/skew-x-[n]/skew-y-[n] |
| `blendMode` | 混合模式 | mix-blend-multiply/screen/overlay 等 |

遇到 DSL 未覆盖的属性，跳过而非猜测。

## 布局转换原则

DSL 给出的是设计稿的绝对像素值，但生成代码时必须理解设计意图，转换为**响应式、弹性的布局方式**，而非照搬像素：

| DSL 特征 | 设计意图 | 正确写法 | 错误写法 |
|----------|----------|----------|----------|
| `flex-row wrap` 容器 + N 个等宽子项 | 一行排 N 个，窄屏自动换行 | 子项用 `flex: 1 1 calc((100% - gaps) / N)` 或 `min-w-[200px] flex-1` | 子项写死 `w-[274px]` |
| `flex-row` 容器 + 不等宽子项 | 主项撑满，辅项固定 | 主项 `flex-1`，辅项 `w-[固定值]` 或 `shrink-0` | 所有项写死宽度 |
| 子项宽度占父容器 50% | 两列布局 | `w-1/2` 或 `basis-1/2` | `w-[587px]` |
| 子项宽度占父容器 100% | 全宽 | `w-full` | `w-[1144px]` |
| 多行表单筛选区，第二行输入项需与第一行列对齐，操作按钮靠右 | 统一 grid 布局 | 所有行放同一个 `grid grid-cols-N gap-*`，输入项各占 1 列，按钮用 `col-start-N flex justify-end` 推到末列 | 第二行另起 flex + `w-1/4`（宽度不含 gap，无法与 grid 列对齐） |

**核心规则**：
1. 父容器有 `flexWrap: wrap` 时，子项**禁止写死像素宽度**，用弹性方式（flex-1/basis/min-w/比例）实现
2. 只有装饰性元素（图标、头像）和设计明确固定的元素（按钮宽度）才用像素宽度
3. 当多个子项在 DSL 中宽度相同，说明设计意图是等分——用 `flex-1` 或百分比而非像素
4. 多行表单/筛选区必须用同一个 grid 容器，禁止拆成多层 flex — 确保跨行列宽一致

## 执行流程

### 步骤 1: 分支验证 + 读取数据

分支检查同 ui-utils.md "分支检查"。

读取 `{UI_DIR}/ui-pages.json`：
- 指定了 `page-id` → 查找对应页面
- 未指定 → 列出有 dsl-raw.json 的页面供用户选择，无可用页面则提示先运行 `/fe-dev:ui-add`

**必须读取 `{UI_DIR}/specs/{pageId}-dsl-raw.json`**（完整读取，这是唯一数据源）。不存在则提示先运行 `/fe-dev:ui-add`。

**读取 `{UI_DIR}/specs/{pageId}-resources.json`**（资源清单，含 `svg_markup` 字段）。不存在则执行：
```bash
node <skill-path>/scripts/dsl-parser.mjs resources {SPECS_DIR}/{pageId}-dsl-raw.json {SPECS_DIR}/{pageId}-resources.json
```

**读取 `{UI_DIR}/specs/{pageId}-tokens.json`**（设计 token 索引）。不存在则执行：
```bash
node <skill-path>/scripts/dsl-parser.mjs tokens {SPECS_DIR}/{pageId}-dsl-raw.json {SPECS_DIR}/{pageId}-tokens.json
```
tokens.json 包含设计稿中所有去重的颜色、字体组合、间距、圆角、阴影值，作为"调色板"辅助精确还原。

如果 `{UI_DIR}/specs/{pageId}-analysis.md` 存在，可作为辅助参考理解组件语义，但**不能替代直接读取 DSL**。analysis.md 不存在也完全不影响代码生成。

### 步骤 2: 读取项目上下文

- 读取关联的 types/services 文件
- 读取参考页面学习代码风格
- `grep -n "nuxt-svgo" nuxt.config.ts` 确认 SVG 使用方式
- **生成 Tailwind 映射表**（关键）：查找项目的 `tailwind.config.*`（ts/js/mjs），执行：
  ```bash
  node <skill-path>/scripts/dsl-parser.mjs tailwind-map {tailwind.config路径} {SPECS_DIR}/{pageId}-tw-map.json
  ```
  生成的映射表包含 `project`（项目自定义）和 `merged`（含 Tailwind 默认值）两部分，覆盖颜色→class、间距→class、字号→class、圆角→class、行高→class、字重→class 的精确映射。脚本会优先尝试动态 import 配置文件（支持 JS/MJS/TS），失败时回退到正则解析。
  
  **用法**：DSL 值映射 Tailwind class 时，先查 tw-map.json：
  - 颜色 `#02B3D6` → 查 `merged.colors["#02b3d6"]` → 得到 `"primary"` → 用 `bg-primary`
  - 间距 `16px` → 查 `merged.spacing["16"]` → 得到 `"4"` → 用 `gap-4`
  - 字号 `14px` → 查 `merged.fontSize["14"]` → 得到 `"sm"` → 用 `text-sm`
  - 圆角 `8px` → 查 `merged.borderRadius["8"]` → 得到 `"lg"` → 用 `rounded-lg`
  - 行高 `24px` → 查 `merged.lineHeight["24"]` → 得到 `"6"` → 用 `leading-6`
  - 字重 `600` → 查 `merged.fontWeight["600"]` → 得到 `"semibold"` → 用 `font-semibold`
  - 查不到 → 用 arbitrary value `[]`
  
  同时读取 CSS 入口文件（如 `assets/css/tailwind.css`、`variables.css`）提取 CSS 变量（`--el-color-primary` 等）

### 步骤 2.5: 大页面检测（强制）

统计 DSL 根节点下的总节点数（用 Read 读取后计数）。**节点总数 > 150 时，必须执行分区生成**：

1. **输出分区计划** — 遍历 DSL 根节点的直接子节点（跳过 `visible=false`、name 含 `_ignore`、高度/宽度为 0 的节点），输出分区清单：
   ```
   分区计划（DSL 节点数: {n}）:
     1. FilterSection ({node.id} "{node.name}") — {子节点数} nodes
     2. StatsCards ({node.id} "{node.name}") — {子节点数} nodes
     3. DimensionBar ({node.id} "{node.name}") — {子节点数} nodes
     4. ActionBar ({node.id} "{node.name}") — {子节点数} nodes
     5. DataTable ({node.id} "{node.name}") — {子节点数} nodes
   ```
   分区计划必须**覆盖所有可见的顶层子节点**，遗漏任何可见子节点视为 error。
2. **逐区域生成** — 在步骤 3 中，按分区计划逐个区域生成代码，每个区域独立读取对应的 DSL 子树
3. 节点总数 ≤ 150 时，跳过此步骤，直接进入步骤 3

### 步骤 3: 生成代码

直接基于 DSL 数据理解设计意图，生成 .vue 文件：

1. **理解设计结构**：从 DSL nodes 层级理解页面分区、组件边界、视觉层级
2. **组件拆分**：根据页面复杂度自行决定是否拆分子组件（>50 行模板考虑提取）
   - **大页面（有分区计划时）**：按步骤 2.5 的分区计划逐个区域生成。每个区域独立对照 DSL 对应子树生成代码，生成后列出该区域覆盖的 DSL 节点 ID，确认无遗漏后再进入下一个区域。最后组装主页面
3. **资源下载与 SVG 映射**（必须在编写 .vue 之前完成）：
   - `resource_type: "image"` → `curl` 下载到 `app/assets/images/`，文件名用 `semantic_name` 的 kebab-case
   - `resource_type: "svg"` → 用 dsl-parser 批量导出（一条命令完成，不要逐个 Write）：
     ```bash
     node <skill-path>/scripts/dsl-parser.mjs export-svgs {SPECS_DIR}/{pageId}-resources.json {svg输出目录}
     ```
     根据 nuxt-svgo 检测结果：有则输出到 `app/assets/icons/svgs/{分类}/`，无则输出到 `app/assets/images/`
   - 下载失败的资源记入 TODO，不阻断代码生成
   - **引用方式**：`<img src="~/assets/images/{filename}" />`（Nuxt `~` 别名指向 app 目录）。禁止使用相对路径 `./assets/` 或 `../assets/`
   
   **SVG 语义化重命名**（强制）：`export-svgs` 导出的文件名基于 DSL node ID（如 `frame-2-06750.svg`），可读性差且易混淆。导出后必须根据 resources.json 中的 `semantic_name` 批量重命名为语义化名称：
   ```bash
   # 示例：mv frame-2-06750.svg refund-stat-icon.svg
   ```
   重命名后对应的 nuxt-svgo 组件名变为 `ICpsRefundStatIcon`，在代码中更易辨识，避免 `206750`/`206760` 等数字 ID 抄错。
   
   **SVG→代码映射表**（强制）：重命名完成后，输出映射表并在编写代码时逐项对照引用：
   ```
   SVG 资源映射:
     gmv-stat-icon.svg (36x36) → StatCard[GMV] 图标 → <ICpsGmvStatIcon>
     commission-stat-icon.svg (36x36) → StatCard[佣金] 图标 → <ICpsCommissionStatIcon>
     order-stat-icon.svg (36x36) → StatCard[订单] 图标 → <ICpsOrderStatIcon>
     refund-stat-icon.svg (36x36) → StatCard[退款] 图标 → <ICpsRefundStatIcon>
     ...
   ```
   **映射表必须包含最终文件名和对应的组件标签名**，编写代码时逐项对照引用，禁止手写组件名。只有 EP 组件内置的功能图标（如 ElSelect 的箭头、ElDatePicker 的日历）不需要导出。
4. **编写 .vue 文件**：
   - `<template>` — 布局样式全部用 Tailwind class
   - `<script setup lang="ts">` — 类型完整，逻辑清晰
   - `<style scoped lang="scss">` — 仅 `:deep()` 和装饰性样式
5. **Tailwind class 优先级**（重要）：DSL 值映射为 Tailwind class 时，**查 tw-map.json 精确匹配**：
   1. **项目已配置的语义 class**（`tw-map.project`）— 如 `#02B3D6` → `primary` → 用 `bg-primary`
   2. **Tailwind 默认 class**（`tw-map.merged`）— 如 `14px` → `sm` → 用 `text-sm`
   3. **Arbitrary value `[]`** — 仅当映射表中查不到时才用，如 `w-[274px]`、`gap-[18px]`
   
   **同时参考 tokens.json** 确保不遗漏设计稿中的颜色/间距值。tokens.json 列出了 DSL 中所有出现的值，逐一与 tw-map 匹配可确保最大化使用语义 class。
6. **EP 组件**：自动添加默认属性（ElInput+clearable, ElSelect+clearable+filterable, ElDatePicker+clearable）

**样式编写自检**：生成前确认布局样式使用 Tailwind class 而非 scoped SCSS。示例：
```html
<!-- 正确：布局用 Tailwind -->
<div class="flex items-center gap-4 p-6 bg-white rounded-lg">
  <el-select class="w-[274px]" clearable filterable />
</div>

<!-- 错误：布局用 scoped SCSS -->
<div class="filter-section">  <!-- SCSS: display:flex; padding:24px; ... -->
  <el-select class="w-full" />
</div>
```

### 步骤 4: 更新状态

ui-pages.json 中 status 更新为 `done`，更新 `updatedAt`。

### 步骤 5: 输出摘要

```
生成文件: {target}
Token 统计: EP({n}) + SCSS({n})
使用 types: {列表}
使用 services: {列表}
资源: 图片 {n} 个, SVG {n} 个
手动 TODO: {描述}
```

### 步骤 6: 询问下一步操作

使用 AskUserQuestion 提供选项（默认推荐第 1 项）：
1. **执行质量检查（推荐）** → 直接执行 `/fe-dev:ui-check {pageId}`
2. **重新生成** → 重新执行 `/fe-dev:ui-gen {pageId}`
3. **结束** → 提示后续可手动执行

> **完整流程**：`/fe-dev:ui-add` → `/fe-dev:ui-gen` → `/fe-dev:ui-check`

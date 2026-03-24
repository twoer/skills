---
name: ui-gen
description: 基于设计规格生成 Vue 页面代码。触发词: "ui gen", "生成页面", "ui-gen", "设计转代码"
allowed-tools: Read, Grep, Glob, Bash
---

# UI Gen - 代码生成

读取 design-spec.md 和项目上下文，生成符合 Element Plus + Tailwind + Scoped SCSS 规范的 .vue 页面文件。

> 共享工具: `<skill-path>/references/ui-utils.md`
> **语言要求**：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

### 步骤 1: 获取 feat 名称

```bash
git branch --show-current
```

不以 `feat/` 开头则提示用户切换到功能分支。

### 步骤 2: 读取 ui-pages.json

路径：`{UI_DIR}/ui-pages.json`

- 如果指定了 `page-id` 参数 → 查找对应页面
- 如果未指定参数：
  - 只有一个 `spec-done` 状态的页面 → 自动选中
  - 有多个 → 列出让用户选择（AskUserQuestion）
  - 没有 → 提示先运行 `/fe-dev:ui-add`

### 步骤 3: 读取 design-spec.md

路径：`{UI_DIR}/specs/{pageId}-spec.md`

如果不存在，提示先运行 `/fe-dev:ui-add`。

### 步骤 4: 扫描项目上下文

**4a. Types**

读取 spec 中"项目上下文 > types"部分列出的类型文件，获取完整的 interface/type 定义。

**4b. Services**

读取 spec 中"项目上下文 > services"部分列出的 composable 文件，了解：
- 导出的方法和参数
- 返回值类型
- 依赖的其他 service

**4c. 参考页面**

如果 spec 中有 reference 页面且文件存在，读取该文件，学习：
- 项目中的代码组织模式
- 现有的样式写法
- composable 的使用方式

**4d. 现有变量文件**

读取项目中已有的 CSS 变量文件（如 `assets/css/variables.css`），了解现有的 design tokens。

### 步骤 5: 识别资源节点

在获取 DSL 数据之前，先从 spec 中识别所有需要下载的资源节点，建立资源清单。

1. **优先读取 spec "资源清单"**（由 ui-add 步骤 7 生成）— 如果存在，直接使用其中的 DSL 节点 ID 和资源类型
2. **兼容旧 spec**：如果 spec 没有"资源清单"区域，则遍历 spec "布局结构"中的语义组件树，找出标注为 `(图标)`、`(图片)` 或语义名包含 `Logo`、`Icon`、`Image` 的节点
3. 记录每个资源节点的语义名、DSL 节点 ID 和资源类型
4. 检查项目是否使用 nuxt-svgo（`nuxt.config.ts` 中是否有 `nuxt-svgo` 模块），确定 SVG 处理方式

> 此步骤的输出将在步骤 6 获取 DSL 后，用于精确提取和下载资源。

### 步骤 6: 获取 DSL 数据并提取资源

从 MasterGo 获取设计稿的原始 DSL 数据，**同时**提取 CSS 样式信息和资源信息。

1. 从 ui-pages.json 读取该页面的 `mastergo` URL
2. 调用 getDsl 获取设计数据（调用方式同 ui-add 步骤 4，含 URL 编码重试）
3. 遍历 DSL 节点树，同时提取 CSS 样式和资源信息：

**3a. CSS 样式提取**（按容器层级提取每个节点的关键 CSS 属性）：

| 类别 | 需提取的属性 |
|------|------------|
| 定位 | `position`, `top`, `left`, `right`, `bottom`, `z-index` |
| 布局 | `display`, `flex-direction`, `flex-wrap`, `gap`, `justify-content`, `align-items` |
| 尺寸 | `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height` |
| 间距 | `padding`, `margin` |
| 排版 | `font-size`, `line-height`, `font-weight`, `color`, `text-align` |
| 文本控制 | `white-space`, `overflow-wrap`, `word-break`, `text-overflow` |
| DSL 文本模式 | `textMode`（DSL TEXT 节点字段，映射规则见 ui-utils.md） |
| 溢出 | `overflow`, `overflow-x`, `overflow-y` |
| 视觉 | `border-radius`, `cursor`, `opacity` |

4. 将 CSS 属性值转换为 Tailwind class（详见 `<skill-path>/references/ui-utils.md` 中的"CSS → Tailwind 映射"表），包括 `textMode` → CSS 映射
5. **绝对定位推断**：对语义组件树中标注为 `(覆盖层)` 的节点，从 DSL 的 `bounds` 或 `layoutStyle` 中提取 `x`、`y` 坐标，映射为 `top-[{y}px] left-[{x}px]`；如果节点有 `zIndex` 也一并提取
6. **文本换行推断**：遍历 DSL 节点树时，对满足以下条件的 TEXT 节点自动补充 `break-words` class：
   - 父容器有 `flexContainerInfo`（Auto Layout）且有宽度约束（`width`/`max-width`）
   - TEXT 节点的 `textMode` 不是 `"single-line"`（或 `textMode` 字段缺失）
   - 这是一个通用规则，适用于所有组件（ElCheckbox、ElRadio、ElButton 等），不仅限于特定组件类型
7. 对满足推断条件的 flex 子项，额外补充 `min-w-0` class（防止 flex 子项内容溢出容器）
8. **EP 组件尺寸不匹配收集**：遍历 DSL 节点时，对已映射到 EP 组件的节点（如 ElInput、ElButton、ElSelect、ElDatePicker），读取其 `height` / `bounds.height`，与 EP 预设尺寸（large=40px, default=32px, small=24px）比对。如果不匹配，**仅记录到内部不匹配列表**，不输出任何提示——所有提示统一在步骤 10d 汇总输出。
9. 构建样式映射表：`{容器标识} → {Tailwind class 列表}`

**3b. 资源信息提取**（与样式提取同步进行）：

遍历 DSL 节点树时，根据步骤 5 建立的资源清单，通过 DSL 节点 ID 精确定位并提取资源数据：

| 节点类型 | 识别条件 | 提取内容 | 处理方式 |
|---------|---------|---------|---------|
| LAYER | `fill` 指向包含 `url` 的 style | 图片远程 URL | → 步骤 7a 下载为 PNG/JPG |
| PATH | 有 `path.data` 字段 | SVG path data + fill | → 步骤 7b 包装为 SVG 文件 |
| SVG_ELLIPSE | 矢量椭圆节点 | 矢量数据 | → 步骤 7b 包装为 SVG 文件 |

**关联 spec 资源清单**：
- 通过 DSL 节点 ID 与步骤 5 的资源清单匹配（精确匹配，而非仅靠 name）
- 匹配到 → 提取实际资源数据（URL、path data 等）
- 未匹配到资源清单的孤立 PATH/LAYER 节点（如装饰性图形）→ 视情况处理或忽略

**构建资源清单**：`{语义名} → {DSL节点ID} → {资源类型} → {资源数据} → {目标路径}`

10. 如果 getDsl 失败，跳过资源提取，仅依赖 spec 中已有的信息生成代码（降级模式，输出提示）

### 步骤 7: 下载资源

基于步骤 6 提取的资源清单，执行实际的下载和文件生成。

#### 7a. 图片资源（光栅图）

图片目录规则：`{vue文件所在目录}/assets/images/`

例如 target 为 `pages/login/index.vue` → `pages/login/assets/images/`

1. 创建 `{pageDir}/assets/images/` 目录
2. 遍历步骤 6 资源清单中的 LAYER 类型资源，下载每个图片 URL：
   - 保留原始文件名；遇到同名文件时自动加序号后缀（如 `bg.png` → `bg-1.png`、`bg-2.png`）
   - **同名处理**：记录原始文件名 → 实际存储文件名的映射，并用实际文件名更新资源清单和路径映射表，确保步骤 8 代码引用的是实际存在的文件名
   - 如果使用 D2C 且 `data.payload.image` 中有额外图片，一并下载
3. **下载校验**：下载后检查文件大小或 Content-Type，确认是有效图片文件。如果文件为空或内容为错误响应（如 XML/HTML），视为下载失败
4. **下载失败处理**：删除无效文件，在路径映射表中标记为 `{原始名} → ./assets/images/{原始名}`（占位路径），并在摘要中列出失败的资源，提示用户手动替换
5. 构建路径映射表：`{远程URL或原始名} → {本地相对路径（含序号后缀）}`
6. 如果没有图片资源，跳过此部分

#### 7b. SVG 图标资源

如果项目使用 nuxt-svgo（步骤 5 已检测），将 SVG 图标提取到全局图标目录。

**目录规则**：`app/assets/icons/svgs/{分类}/`

分类依据页面/模块，如：
- `common/` — 通用图标（Logo、搜索、通知等跨页面复用的图标）
- `login/` — 登录页专用图标
- `admin/` — 管理后台专用图标
- `stats/` — 数据统计模块专用图标

**文件命名规则**：kebab-case，语义化命名（如 `data-analysis.svg`、`arrow-down.svg`）

1. 遍历步骤 6 资源清单中的 PATH/SVG_ELLIPSE 类型资源
2. 将 path data 包装为完整 SVG 文件，多个 PATH 属于同一图标容器时合并
   ```xml
   <svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
     <path d="{path.data}" fill="{fill}" />
   </svg>
   ```
3. 写入对应分类目录，已存在的同名文件不覆盖，在 TODO list 中提示用户确认
4. 如果使用 D2C 且 `data.payload.svg` 中有额外 SVG，一并处理
5. 构建命名映射表：`{语义名} → {SVG 文件名} → {组件名}`
6. 如果没有 SVG 资源，跳过此部分

**组件引用方式**（nuxt-svgo 项目）：

根据 `nuxt.config.ts` 中 `svgo.componentPrefix` 确定前缀，默认为 `I`：

```vue
<el-icon size="20">
  <ICommonLogo />
</el-icon>
```

**非 nuxt-svgo 项目**：SVG 降级到 7a 图片资源处理。

### 步骤 8: 生成代码

基于 spec、项目上下文、步骤 7 的路径映射表和步骤 6 的样式映射表，生成完整的 .vue 文件。

**样式来源优先级（从高到低）：**

1. **EP 组件属性**（spec）— 决定组件选择和组件级 props（`label-position`、`type`、`size`）
2. **DSL 原始样式**（步骤 6）— 决定容器的 Tailwind class（布局、间距、排版、溢出）
3. **默认值** — 都没有时使用 Element Plus 默认值

图片引用规则：
- 使用相对于 Vue 文件的本地路径：`./assets/images/logo.png`
- 禁止引用 MasterGo 远程 URL

图标引用规则：
- **必须优先使用步骤 7 下载/提取的资源**，对照步骤 6 构建的资源清单，按语义名匹配
- 如果项目使用 nuxt-svgo，SVG 图标使用自动导入组件方式（如 `<ICommonLogo />`），不使用 `<img>` 标签
- 如果项目未使用 nuxt-svgo，SVG 降级为图片引用（`./assets/images/xxx.svg`）
- **禁止用 EP 图标组件替代设计稿中的自定义图标/Logo** — 如果步骤 5 成功提取了资源（资源清单中有对应条目），必须使用该资源，而非 `<DataAnalysis />` 等 EP 图标
- 仅当资源下载/提取失败（资源清单中标记为失败），才允许临时使用 EP 图标替代，并**必须在 TODO list 中记录**

**INSTANCE 节点映射**：

组件属性规则：
- 从 spec"组件清单"的 `EP 属性` 列读取属性，写入对应组件标签
- 未记录的属性使用 Element Plus 默认值，不额外添加
- **默认添加的属性**（详见 ui-utils.md "EP 组件默认属性规则"）：
  - ElInput → 默认加 `clearable`
  - ElSelect → 默认加 `clearable` + `filterable`
  - ElDatePicker → 默认加 `clearable`

**INSTANCE 节点映射**：
- DSL 中的 INSTANCE 节点表示 MasterGo 组件实例，优先映射到对应的 EP 组件
- 如果 INSTANCE 的主组件在 spec 的语义分析中已识别，直接使用该映射

**组件拆分策略**：
- 单个 .vue 文件的 `<template>` 部分超过 50 行时，考虑提取子组件
- 拆分依据为 spec 语义分析中的组件树（PascalCase 命名的逻辑单元）
- 子组件文件放置在同目录的 `components/` 子目录下
- 简单页面（表单、登录等）不需要拆分

**覆盖层定位规则**：
- 语义组件树中标注为 `(覆盖层)` 的节点，必须使用 `absolute` 定位
- 定位值从以下来源按优先级获取：
  1. **spec"布局结构"** 中明确描述的位置（如"位于插图上方左侧 40px, 100px 处" → `top-[100px] left-[40px]`）
  2. **spec"语义组件树"** 中节点的 bounds 信息（`[x, y, width, height]`）
  3. **DSL 节点** 的 `bounds` / `layoutStyle` 中的 `x`、`y` 坐标
- **禁止猜测**：如果没有明确的定位数据，应输出 `<!-- TODO: 需确认覆盖层定位 -->` 并在摘要中提示，而不是自行假设位置

#### 代码结构

```vue
<template>
  <!-- 1. 使用 Tailwind class 处理布局、间距、响应式 -->
  <!-- 2. 使用 Element Plus 组件 -->
  <!-- 3. 不使用内联 style -->
</template>

<script setup lang="ts">
// 1. 导入关联的 TypeScript 类型
import type { XxxModel } from '~/types/xxx'

// 2. 导入关联的 service composable
import { useXxxService } from '~/composables/useXxxService'

// 3. 页面逻辑
</script>

<style scoped lang="scss">
// 仅允许：
// 1. :deep() 覆盖 Element Plus 组件样式
// 2. 装饰性样式（渐变、模糊、动画）
// 3. CSS 变量定义
</style>
```

#### 样式规则（严格遵守）

**优先级从高到低：**

1. **Element Plus 组件** — 不要手动实现已有组件
2. **Tailwind CSS class** — 布局、间距、尺寸、响应式、文字，**必须写在 `<template>` 元素的 class 属性上**
3. **Scoped SCSS** — 仅 `:deep()` 覆盖和装饰性样式。如需在 `<style>` 中使用 Tailwind，必须用 `@apply`（如 `@apply min-w-0;`），禁止裸写 Tailwind class
4. **禁止** — `style="..."` 内联样式、全局 SCSS、`!important`、`<style>` 块中裸写 Tailwind class（如 `min-w-0;`）
5. **禁止硬编码负像素边距** — 如 `mt-[-540px]`、`ml-[-100px]` 等。负边距 hack 说明布局结构理解有误（如将覆盖层当成了 flex 兄弟节点）。覆盖层必须使用 `absolute` / `relative` + `top` / `bottom` / `left` / `right` 定位

#### 组件映射参考

详见 `<skill-path>/references/ui-utils.md` 中的"Element Plus 组件映射"表。

#### EP 组件文本换行覆盖

生成代码时，对照 `<skill-path>/references/ui-utils.md` 中的"EP 组件文本换行覆盖清单"：
- 当 EP 组件内包含较长文本且设计稿中该文本换行时，在 `<style scoped>` 中添加 `:deep()` 覆盖
- 短文本场景（如按钮单个词）保持 EP 默认 nowrap，不覆盖

#### EP 组件尺寸不匹配覆盖

当 spec 中组件区域标注了 `height-override`（设计稿高度不等于 EP 预设 24/32/40px），**提示用户确认**是否需要 `:deep()` 覆盖，而非直接写入：

```
📏 尺寸不匹配检测:
  ⚠️ ElInput: 设计稿 36px, EP default=32px, 差值 4px
     → 覆盖代码: :deep(.el-input__wrapper) { height: 36px; line-height: 36px }
     → 是否覆盖？差值较小，可忽略使用 EP 默认值
```

用户选择：
- **覆盖** → 写入 `:deep()` 样式
- **忽略** → 使用最接近的 EP size，接受微小差异

**需要覆盖的内部选择器：**

| 组件 | 需覆盖的选择器 |
|------|-------------|
| ElInput | `.el-input__wrapper` |
| ElButton | `.el-button`（直接加在父级 class 上即可） |
| ElSelect | `.el-select__wrapper` |
| ElDatePicker | `.el-input__wrapper` |
| ElRadio | `.el-radio__inner`（调整圆圈大小） |
| ElCheckbox | `.el-checkbox__inner`（调整方框大小） |

覆盖时需同时调整 `line-height: {height}px`，确保文字垂直居中。

#### Tailwind 常用 class 参考

详见 `<skill-path>/references/ui-utils.md` 中的"Tailwind 常用 class"表。

### 步骤 9: 写入 .vue 文件

写入到 spec 中指定的 target 路径（或 ui-pages.json 中的 target 字段）。

如果文件已存在：
- 提示用户确认覆盖
- 覆盖前可选择备份原文件

### 步骤 10: 处理 Design Tokens

对比 spec 中的 tokens 与项目现有变量文件：

**10a. Element Plus 主题 tokens**

搜索 `assets/css/` 下的 CSS 变量文件（如 `variables.css`、`element-variables.css`），列出每个 token 的状态：

```
🔍 EP Token 检查:
  ✅ --el-color-primary: #02B3D6 (已存在，值一致)
  ⚠️ --el-color-success: #67C23A → 设计稿要求 #4CAF50 (已存在，值不同)
  ❌ --el-border-radius-lg: 12px (不存在，建议新增)
```

按状态处理：
- 已存在且值一致 → 跳过
- 已存在且值不同 → 提示用户确认是否覆盖
- 不存在 → 提示用户是否新增

**10b. Tailwind 扩展 tokens（颜色引用 EP 变量）**

检查 `tailwind.config.ts` 中的颜色类配置：

- 如果 `tailwind.config.ts` 中的颜色是**硬编码 hex 值**（如 `primary: '#6B21A8'`），且与 Element Plus 主题 token 对应（如 `--el-color-primary`），建议改为引用 CSS 变量：
  ```ts
  // ❌ 硬编码，与 EP 主色不同步
  primary: { DEFAULT: '#6B21A8' }

  // ✅ 引用 EP 变量，保持单一数据源
  primary: {
    DEFAULT: 'var(--el-color-primary)',
    light: 'var(--el-color-primary-light-3)',
    lighter: 'var(--el-color-primary-light-5)',
    dark: 'var(--el-color-primary-dark-2)',
  }
  ```
- 非颜色的 Tailwind 扩展 token（字体、间距等）正常检查，已存在且值不同 → 提示用户确认；不存在 → 提示新增

**10c. Scoped SCSS tokens**

页面级 tokens 直接写入 .vue 文件的 `<style>` 部分，无需确认。

**10d. EP 组件尺寸不匹配检测**

合并两个来源的检测结果（去重），统一提示用户：

1. **spec 中的 `height-override`**（ui-add 分析时记录）
2. **步骤 6.8 收集的 DSL 高度比对**（ui-gen 运行时检测，可覆盖无 spec 的情况）

对每个不匹配项（按组件实例去重），使用 AskUserQuestion 提示用户逐一确认：

```
📏 尺寸不匹配检测:
  ⚠️ ElInput (用户名): 设计稿 36px, EP default=32px, 差值 4px
     → 覆盖代码: :deep(.el-input__wrapper) { height: 36px; line-height: 36px }
     → 是否覆盖？差值较小，可忽略使用 EP 默认值
```

用户选择：
- **覆盖** → 写入 `:deep()` 样式（选择器参见"EP 组件尺寸不匹配覆盖"章节）
- **忽略** → 使用最接近的 EP size，接受微小差异

### 步骤 11: 更新 ui-pages.json

将页面状态更新为 `converted`，更新 `updatedAt` 时间戳。

### 步骤 12: 输出摘要

```
✅ 页面代码已生成
📄 文件: {target}
🎨 新增 tokens: EP({n}) + SCSS({n})
📦 使用 types: {列表}
📦 使用 services: {列表}
🖼️ 图片: {n} 个成功, {n} 个失败（需手动替换到 {pageDir}/assets/images/）
🔧 SVG 图标: {n} 个已导出到 assets/icons/svgs/{分类}/
```

**人工待办清单**：

代码生成过程中，凡是无法自动完成、使用了替代方案或需要人工确认的项，汇总为 TODO list：

```
📋 人工待办清单:
  [ ] {行号} Logo 使用了 EP 图标 <DataAnalysis /> 替代，需替换为 SVG 组件 <ICommonLogo />
  [ ] {行号} 菜单图标"数据统计"使用了 <DataAnalysis /> 替代，需替换为 <IStatsDataAnalysis />
  [ ] {行号} 面包屑最后一级缺少黑色+加粗样式，需添加 :deep() 覆盖
  [ ] {pageDir}/assets/images/ 下载失败的 {n} 个图片资源需手动替换
  [ ] assets/icons/svgs/ 中 {n} 个 SVG 组件名需确认是否符合项目命名规范
  [ ] 尺寸不匹配: ElInput (用户名) 设计稿 36px vs EP default 32px，需确认是否覆盖
```

**需纳入清单的场景**：

| 场景 | 说明 |
|------|------|
| 图标/Logo 替代 | 设计稿有图片/SVG 但未获取到，用 EP 图标替代时（现在应该很少发生） |
| SVG 命名确认 | 新导出的 SVG 组件名是否符合项目命名规范 |
| 图片下载失败 | 步骤 7a 中下载校验失败的资源 |
| 样式缺失 | 设计稿明确要求但代码中未实现的样式（如面包屑最后一级加粗） |
| EP 尺寸不匹配 | 步骤 10d 中用户选择"覆盖"或"待确认"的项 |
| 确认性标注 | 代码中输出了 `<!-- TODO: -->` 注释的项 |
| 文本换行覆盖 | 短文本场景默认 nowrap，但如果设计稿有换行需求需手动处理 |

### 步骤 13: 自动质量检查

代码生成完成后，**立即自动执行**质检流程（同 `/fe-dev:ui-check`）：

1. 读取刚生成的 .vue 文件，对照 `<skill-path>/references/ui-utils.md` 质检规则扫描
2. 输出检查结果（error / warning / info 分级）
3. 对 warning 级别问题自动修复：
   - 硬编码色值 → 替换为 design token
   - 缺少 `cursor-pointer` → 添加
   - 缺少 `transition` → 添加
   - 有 `transition` 无 `hover:` 效果 → 添加 `hover:opacity-80`
   - 缺少 `alt` → 添加
   - flex 文本子项缺少 `min-w-0` → 添加
   - 宽度约束文本缺少 `break-words` → 添加
   - EP 默认属性缺失（ElInput/ElSelect/ElDatePicker 缺少 `clearable`，ElSelect 缺少 `filterable`）→ 添加
4. 对不可自动修复的 warning（EP 图标替代设计稿图标），记入 TODO list
5. 修复后重新检查，无 error 则更新状态为 `reviewed`
6. 最终输出质检结果摘要 + 未修复项 TODO list

> 如果存在无法自动修复的 error，状态保持 `converted`，提示用户手动修复后重新执行 `/fe-dev:ui-check`。

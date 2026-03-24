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

### 步骤 5: 下载图片资源

从设计数据中收集所有图片资源（光栅图 + SVG），下载到页面本地目录。

图片目录规则：`{vue文件所在目录}/assets/images/`

例如 target 为 `pages/login/index.vue` → `pages/login/assets/images/`

1. 从设计数据中收集图片：
   - D2C 返回的 `data.payload.image` 中的远程 URL（光栅图）
   - D2C 返回的 `data.payload.svg` 中的 SVG 内容
2. 创建 `{pageDir}/assets/images/` 目录
3. 下载每个资源到本地，保留原始文件名；遇到同名文件时自动加序号后缀（如 `bg.png` → `bg-1.png`、`bg-2.png`）
4. SVG 如果是纯内容（非 URL），写入 `.svg` 文件
5. **下载校验**：下载后检查文件大小或 Content-Type，确认是有效图片文件。如果文件为空或内容为错误响应（如 XML/HTML），视为下载失败
6. **下载失败处理**：删除无效文件，在路径映射表中标记为 `{原始名} → ./assets/images/{原始名}`（占位路径），并在摘要中列出失败的资源，提示用户手动替换
7. 构建路径映射表：`{远程URL或原始名} → {本地相对路径}`
8. 如果没有图片资源，跳过此步骤

### 步骤 6: 获取 DSL 样式数据

从 MasterGo 获取设计稿的原始 DSL 数据，提取精确的 CSS 样式信息，补充 spec 中未记录的视觉细节。

1. 从 ui-pages.json 读取该页面的 `mastergo` URL
2. 调用 getDsl 获取设计数据（调用方式同 ui-add 步骤 4，含 URL 编码重试）
3. 遍历 DSL 节点树，按容器层级提取每个节点的关键 CSS 属性：

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
8. 构建样式映射表：`{容器标识} → {Tailwind class 列表}`
9. 如果 getDsl 失败，跳过此步骤，仅依赖 spec 生成代码（降级模式，输出提示）

### 步骤 7: 生成代码

基于 spec、项目上下文、步骤 5 的路径映射表和步骤 6 的样式映射表，生成完整的 .vue 文件。

**样式来源优先级（从高到低）：**

1. **EP 组件属性**（spec）— 决定组件选择和组件级 props（`label-position`、`type`、`size`）
2. **DSL 原始样式**（步骤 6）— 决定容器的 Tailwind class（布局、间距、排版、溢出）
3. **默认值** — 都没有时使用 Element Plus 默认值

图片引用规则：
- 使用相对于 Vue 文件的本地路径：`./assets/images/logo.png`
- 禁止引用 MasterGo 远程 URL

组件属性规则：
- 从 spec"组件清单"的 `EP 属性` 列读取属性，写入对应组件标签
- 未记录的属性使用 Element Plus 默认值，不额外添加

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
2. **Tailwind CSS class** — 布局、间距、尺寸、响应式、文字
3. **Scoped SCSS** — 仅 `:deep()` 覆盖和装饰性样式
4. **禁止** — `style="..."` 内联样式、全局 SCSS、`!important`
5. **禁止硬编码负像素边距** — 如 `mt-[-540px]`、`ml-[-100px]` 等。负边距 hack 说明布局结构理解有误（如将覆盖层当成了 flex 兄弟节点）。覆盖层必须使用 `absolute` / `relative` + `top` / `bottom` / `left` / `right` 定位

#### 组件映射参考

详见 `<skill-path>/references/ui-utils.md` 中的"Element Plus 组件映射"表。

#### EP 组件文本换行覆盖

生成代码时，对照 `<skill-path>/references/ui-utils.md` 中的"EP 组件文本换行覆盖清单"：
- 当 EP 组件内包含较长文本且设计稿中该文本换行时，在 `<style scoped>` 中添加 `:deep()` 覆盖
- 短文本场景（如按钮单个词）保持 EP 默认 nowrap，不覆盖

#### Tailwind 常用 class 参考

详见 `<skill-path>/references/ui-utils.md` 中的"Tailwind 常用 class"表。

### 步骤 8: 写入 .vue 文件

写入到 spec 中指定的 target 路径（或 ui-pages.json 中的 target 字段）。

如果文件已存在：
- 提示用户确认覆盖
- 覆盖前可选择备份原文件

### 步骤 9: 处理 Design Tokens

对比 spec 中的 tokens 与项目现有变量文件：

**9a. Element Plus 主题 tokens**

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

**9b. Tailwind 扩展 tokens**

检查 `tailwind.config.ts` 中是否已有对应配置：
- 已存在且值不同 → 提示用户确认
- 不存在 → 提示用户是否新增

**9c. Scoped SCSS tokens**

页面级 tokens 直接写入 .vue 文件的 `<style>` 部分，无需确认。

### 步骤 10: 更新 ui-pages.json

将页面状态更新为 `converted`，更新 `updatedAt` 时间戳。

### 步骤 11: 输出摘要

```
✅ 页面代码已生成
📄 文件: {target}
🎨 新增 tokens: EP({n}) + Tailwind({n}) + SCSS({n})
📦 使用 types: {列表}
📦 使用 services: {列表}
🖼️ 图片: {n} 个成功, {n} 个失败（需手动替换到 {pageDir}/assets/images/）
```

### 步骤 12: 自动质量检查

代码生成完成后，**立即自动执行**质检流程（同 `/fe-dev:ui-check`）：

1. 读取刚生成的 .vue 文件，对照 `<skill-path>/references/ui-utils.md` 质检规则扫描
2. 输出检查结果（error / warning / info 分级）
3. 对 warning 级别问题自动修复（硬编码色值替换 token、添加 cursor-pointer 等）
4. 修复后重新检查，无 error 则更新状态为 `reviewed`
5. 最终输出质检结果摘要

> 如果存在无法自动修复的 error，状态保持 `converted`，提示用户手动修复后重新执行 `/fe-dev:ui-check`。

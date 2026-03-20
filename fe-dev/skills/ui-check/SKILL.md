---
name: ui-check
description: 生成代码质量检查。触发词: "ui check", "质量检查", "ui-check"
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
---

# UI Check - 质量检查

你是一位严格但务实的前端代码审查专家。你关注两类问题：影响用户体验的（可访问性、交互反馈、文本溢出）和影响可维护性的（样式规范、组件属性一致性）。你能自动修复明确的问题，对需要设计判断的问题列出供人工决策。

> 共享约定: `<skill-path>/references/ui-utils.md`

## 执行流程

### 步骤 1: 分支验证 + 确定范围

分支检查同 ui-utils.md "分支检查"。

读取 `{UI_DIR}/ui-pages.json`：
- 指定了 `page-id` → 只检查该页面
- 未指定 → 检查所有 `status=done` 的页面

### 步骤 2: 还原度校验（tokens.json 交叉比对）

读取 `{UI_DIR}/specs/{pageId}-tokens.json`（不存在则先生成）和 `{UI_DIR}/specs/{pageId}-tw-map.json`（不存在则跳过此步骤）。

将 tokens.json 中的每项值与 .vue 文件内容交叉比对：

**颜色覆盖**：tokens.json 中每个颜色值（如 `#02b3d6`），检查代码中是否以 Tailwind class 形式出现（`bg-primary`、`text-[#02b3d6]` 等均算命中）。未命中 → 列为 `missing_color`。

**间距覆盖**：tokens.json 中每个间距值（如 `16`），检查代码中是否出现对应 class（`p-4`、`gap-4`、`m-[16px]` 等均算命中）。仅检查 padding/margin/gap 类，不检查 width/height（尺寸不要求全覆盖）。未命中 → 列为 `missing_spacing`。

**字体覆盖**：tokens.json 中每个字体组合（如 `14px w400 /22px`），检查代码中是否存在对应的 fontSize class（`text-sm` 或 `text-[14px]`）。未命中 → 列为 `missing_font`。

**阴影覆盖**：tokens.json 中每个阴影定义，检查代码中是否存在 shadow class。未命中 → 列为 `missing_shadow`。

**判定逻辑**：
- 某些 token 可能属于设计稿中的隐含背景或装饰层，生成代码中合理省略不算遗漏
- 颜色 `#ffffff`（白色）和 `#000000`（黑色）在背景/文本中极常见，只有明确缺失才标记
- 覆盖率 = 命中数 / 总数，低于 80% → error，80-95% → warning，95%+ → 通过

输出格式：
```
还原度校验: {pageId}
颜色: {命中}/{总数} ({百分比}%)
  缺失: #999999 (用于副标题文本), #f0f0f0 (用于分割线背景)
间距: {命中}/{总数} ({百分比}%)
  缺失: 32 (可能用于内容区 padding)
字体: {命中}/{总数} ({百分比}%)
阴影: {命中}/{总数} ({百分比}%)
```

### 步骤 2.5: DSL 节点覆盖率检查

读取 `{UI_DIR}/specs/{pageId}-dsl-raw.json`，遍历根节点的直接子节点（跳过 `visible=false`、name 含 `_ignore`、宽度或高度为 0 的节点），与生成的 .vue 代码交叉比对：

- 对每个可见的顶层子节点，根据其 name、包含的文本内容、结构特征，判断生成代码中是否有对应的 HTML 结构
- 输出覆盖清单：
  ```
  DSL 节点覆盖率:
    ✅ 容器 659 (筛选区) → FilterSection
    ✅ 容器 664 (指标卡片) → StatsCards
    ❌ 容器 667 (自定义列表+导出) → 缺失"自定义列表"按钮
    ✅ 容器 669 (表格+分页) → DataTable
    覆盖率: 4/5 (80%)
  ```
- 覆盖率 < 90% → error，建议重新执行 `/fe-dev:ui-gen`

### 步骤 3: 代码规范扫描

对每个目标文件，读取内容并按以下规则扫描。

**error 级别**：
- 无内联 `style="..."`；`<style>` 必须有 `scoped`；表单字段必须有 `label`/`aria-label`
- 禁止负像素边距（覆盖层用 `absolute`/`relative`）
- Tailwind class 必须写在 `<template>` class 上，`<style>` 中仅允许 `@apply` 用于 hover/focus 状态组合，禁止裸写 Tailwind class
- **引用存在性检查**：扫描 `<script setup>` 中使用的 composable（`use*()` 调用）、组件（`<template>` 中的自定义组件标签）、import 路径，验证：
  - 显式 import 的文件路径是否存在
  - 未显式 import 的 composable 是否在 Nuxt auto-import 范围内（`composables/` 一级目录）。位于子目录（如 `composables/reports/`）的需要显式 import 或在 `nuxt.config.ts` 的 `imports.dirs` 中配置
  - `<img src="...">` 引用的资源文件是否存在

**warning 级别**：
- 可点击元素 → `cursor-pointer`；hover → `transition`(150-300ms)
- 颜色变化 → `transition: color 200ms`（非 `all`）；transition 必须配对 `hover:` 效果
- `<img>` → `alt`；文字对比度 >= 4.5:1；`focus` 可见
- flex 容器内文本子项 → `min-w-0`；宽度约束内文本 → `break-words`
- ElInput 缺 `clearable`、ElSelect 缺 `clearable`/`filterable`、ElDatePicker 缺 `clearable`
- ElTableColumn 数字/金额列缺 `align="right"`、日期/状态/操作列缺 `align="center"`
- 禁止用 EP 图标替代设计稿自定义图标/Logo；资源清单有对应条目 → warning；无条目 → info

### 步骤 4: 输出检查结果

```
质量检查结果: {pageId}

Error (2):
  - 第 45 行: 发现内联 style="color: red"
  - 第 12 行: <el-input> 缺少 label 或 aria-label

Warning (3):
  - 第 30 行: <a> 标签缺少 cursor-pointer class
  - 第 55 行: hover 效果缺少 transition
  - 第 60 行: 文字对比度不足（#999 on #fff = 2.8:1）

Info (1):
  - 建议使用 ElPagination 替代手动分页实现
```

### 步骤 5: 自动修复

**可自动修复**（仅限 DSL 或规则可确定的修复，禁止猜测样式）：

代码规范类：
- 引用缺失的 composable → 用 Grep 定位实际文件路径，添加显式 import
- 引用不存在的资源文件 → 用 Glob 查找正确路径并修正 src 属性
- 硬编码色值 → 替换为已注册的 design token
- 缺 `cursor-pointer` → 添加
- 缺 `transition` → 添加 `transition: color 200ms`
- `<img>` 缺 `alt` → 添加 `alt=""`
- flex 文本子项缺 `min-w-0` → 添加
- 宽度约束文本缺 `break-words` → 添加
- EP 默认属性缺失 → 添加

还原度类（需回查 dsl-raw.json 确认用途后补充）：
- `missing_color` → 在 DSL 中定位该颜色所在节点，找到对应的 template 元素补上正确的 class
- `missing_spacing` → 在 DSL 中定位该间距所在节点，补上对应的 padding/margin/gap class
- `missing_font` → 在 DSL 中定位该字体组合所在文本节点，补上正确的 text-/font-/leading- class
- `missing_shadow` → 在 DSL 中定位该阴影所在节点，补上 shadow class

**不可自动修复，记入 TODO**：
- 有 `transition` 但无 `hover:` 效果 → 需人工判断 hover 样式，不自动猜测
- EP 图标替代设计稿自定义图标
- 还原度校验中覆盖率低于 80% → 建议重新执行 `/fe-dev:ui-gen` 而非逐项修补

修复后重新检查。有 error 或还原度 <80% → 保持当前状态提示修复。无 error 且还原度 >=80% → 输出通过。

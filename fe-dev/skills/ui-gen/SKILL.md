---
name: ui-gen
description: 基于设计规格生成 Vue 页面代码。触发词: "ui gen", "生成页面", "ui-gen", "设计转代码"
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

### 步骤 5: 生成代码

基于 spec 和项目上下文，生成完整的 .vue 文件。

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

#### 组件映射参考

详见 `<skill-path>/references/ui-utils.md` 中的"Element Plus 组件映射"表。

#### Tailwind 常用 class 参考

详见 `<skill-path>/references/ui-utils.md` 中的"Tailwind 常用 class"表。

### 步骤 6: 写入 .vue 文件

写入到 spec 中指定的 target 路径（或 ui-pages.json 中的 target 字段）。

如果文件已存在：
- 提示用户确认覆盖
- 覆盖前可选择备份原文件

### 步骤 7: 处理 Design Tokens

对比 spec 中的 tokens 与项目现有变量文件：

**7a. Element Plus 主题 tokens**

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

**7b. Tailwind 扩展 tokens**

检查 `tailwind.config.ts` 中是否已有对应配置：
- 已存在且值不同 → 提示用户确认
- 不存在 → 提示用户是否新增

**7c. Scoped SCSS tokens**

页面级 tokens 直接写入 .vue 文件的 `<style>` 部分，无需确认。

### 步骤 8: 更新 ui-pages.json

将页面状态更新为 `converted`，更新 `updatedAt` 时间戳。

### 步骤 9: 输出摘要

```
✅ 页面代码已生成
📄 文件: {target}
🎨 新增 tokens: EP({n}) + Tailwind({n}) + SCSS({n})
📦 使用 types: {列表}
📦 使用 services: {列表}
```

### 步骤 10: 自动质量检查

代码生成完成后，**立即自动执行**质检流程（同 `/fe-dev:ui-check`）：

1. 读取刚生成的 .vue 文件，对照 `<skill-path>/references/ui-utils.md` 质检规则扫描
2. 输出检查结果（error / warning / info 分级）
3. 对 warning 级别问题自动修复（硬编码色值替换 token、添加 cursor-pointer 等）
4. 修复后重新检查，无 error 则更新状态为 `reviewed`
5. 最终输出质检结果摘要

> 如果存在无法自动修复的 error，状态保持 `converted`，提示用户手动修复后重新执行 `/fe-dev:ui-check`。

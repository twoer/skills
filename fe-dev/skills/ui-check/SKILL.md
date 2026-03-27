---
name: ui-check
description: 生成代码质量检查。触发词: "ui check", "质量检查", "ui-check"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# UI Check - 质量检查

你是一位严格但务实的前端代码审查专家。你关注两类问题：影响用户体验的（可访问性、交互反馈、文本溢出）和影响可维护性的（样式规范、组件属性一致性）。你能自动修复明确的问题，对需要设计判断的问题列出供人工决策。

> 共享约定: `<skill-path>/references/ui-utils.md`
> 语言要求：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

### 步骤 1: 分支验证 + 确定范围

分支检查同 ui-utils.md "分支检查"。

读取 `{UI_DIR}/ui-pages.json`：
- 指定了 `page-id` → 只检查该页面
- 未指定 → 检查所有 `status=done` 的页面

### 步骤 2: 扫描 .vue 文件

对每个目标文件，读取内容并按以下规则扫描。

**error 级别**：
- 无内联 `style="..."`；`<style>` 必须有 `scoped`；表单字段必须有 `label`/`aria-label`
- 禁止负像素边距（覆盖层用 `absolute`/`relative`）
- Tailwind class 必须写在 `<template>` class 上，`<style>` 中须用 `@apply`

**warning 级别**：
- 可点击元素 → `cursor-pointer`；hover → `transition`(150-300ms)
- 颜色变化 → `transition: color 200ms`（非 `all`）；transition 必须配对 `hover:` 效果
- `<img>` → `alt`；文字对比度 >= 4.5:1；`focus` 可见
- flex 容器内文本子项 → `min-w-0`；宽度约束内文本 → `break-words`
- ElInput 缺 `clearable`、ElSelect 缺 `clearable`/`filterable`、ElDatePicker 缺 `clearable`
- ElTableColumn 数字/金额列缺 `align="right"`、日期/状态/操作列缺 `align="center"`
- 禁止用 EP 图标替代设计稿自定义图标/Logo；资源清单有对应条目 → warning；无条目 → info

### 步骤 3: 输出检查结果

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

### 步骤 4: 自动修复 Warning

**可自动修复**：
- 硬编码色值 → 替换为已注册的 design token
- 缺 `cursor-pointer` → 添加
- 缺 `transition` → 添加 `transition: color 200ms`
- 有 `transition` 但无 `hover:` → 添加 `hover:opacity-80`
- `<img>` 缺 `alt` → 添加 `alt=""`
- flex 文本子项缺 `min-w-0` → 添加
- 宽度约束文本缺 `break-words` → 添加
- EP 默认属性缺失 → 添加

**不可自动修复，记入 TODO**：EP 图标替代设计稿自定义图标

修复后重新检查。有 error → 保持当前状态提示修复。无 error → 输出通过。

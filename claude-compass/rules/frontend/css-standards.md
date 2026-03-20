---
description: CSS 样式编写规范，定义样式优先级和禁止项
paths:
  - "app/**/*.vue"
  - "app/**/*.scss"
  - "app/**/*.css"
  - "src/**/*.vue"
  - "src/**/*.scss"
  - "src/**/*.css"
---

# CSS 样式规范

## 样式优先级（从高到低）

1. Element Plus 组件（优先使用内置样式）
2. Tailwind CSS class（必须写在 `<template>` class 属性上）
3. Tailwind `@apply`（仅在 `<style scoped>` 中用于 hover/focus 状态组合）
4. Scoped SCSS（仅 `:deep()` 覆盖和装饰性样式）

## 禁止项

- 禁止内联 `style` 和 `:style` 绑定
- 禁止全局 SCSS（必须 `<style scoped>`）
- 禁止 `!important`
- 禁止在 `<style>` 中裸写 Tailwind class
- z-index 使用预定义层级变量，禁止随意写大数字
- 颜色、间距使用 CSS 变量或 Tailwind 类，避免硬编码魔法数字

## 原因

统一样式优先级避免 Element Plus 组件被意外覆盖，Scoped 防止样式污染。

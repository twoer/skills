---
description: Vue 3 / Nuxt 4 组件开发约定
paths:
  - "app/**/*.vue"
  - "app/**/*.ts"
  - "src/**/*.vue"
  - "src/**/*.ts"
---

# Vue / Nuxt 约定

## 要求

- 组件文件名使用 PascalCase，体现业务语义
- `<script setup>` 中统一使用箭头函数 `const fn = () => {}`
- 禁止使用 `any` 类型，必须定义具体类型
- composables 命名以 `use` 开头（如 `useAuthService`）
- 交互状态切换必须添加 `transition`，禁止生硬跳变
- 禁止在组件中单独设置 `font-family`，统一继承全局配置
- EP 组件默认属性：ElInput `clearable`、ElSelect `clearable filterable`、ElDatePicker `clearable`

## 原因

一致的组件约定减少团队成员间的理解成本，提高代码审查效率。

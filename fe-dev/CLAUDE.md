# fe-dev Skill

前端开发助手，用于项目初始化和开发工作流管理。

## 命令体系

- **项目初始化**: `/fe-dev:init`、`/fe-dev:claude-init`
- **Feature 工作流**: `/fe-dev:feat-new` → `feat-req` → `feat-gen` → `feat-exec` → `feat-done` → `feat-archive`
- **UI 设计稿**: `/fe-dev:ui-setup` → `ui-add` → `ui-gen` → `ui-check`
- **Spec 规范**: `/fe-dev:spec api-sync`、`spec req-gen`、`spec req-exec`

完整命令列表见 `/fe-dev:index` 或 README.md。

## 技术栈

Nuxt 4 + Vue 3 + TypeScript + Element Plus + Tailwind CSS + Scoped SCSS + Pinia

## 关键约定

### 路径约定

- Feature 文档：`docs/features/feat-{name}/`
- UI 设计数据：`docs/features/feat-{name}/ui/`（挂在 feat 目录下）
- Spec 数据：`apps/frontend/docs/{branchKey}/`

### 分支约定

- Feature/UI 工作在 `feat/{name}` 分支，非 feat 分支提示切换
- Spec 对非 feat 分支优雅降级（用完整分支名）

### UI 样式优先级

1. Element Plus 组件
2. Tailwind CSS class（必须写在 `<template>` class 属性上）
3. Scoped SCSS（仅 `:deep()` 和装饰性样式）
4. 禁止：内联 style、全局 SCSS、!important

## 共享文件

- `references/feat-utils.md` — feat-* 系列共享命令和路径
- `references/ui-utils.md` — UI 系列共享约定和 API 调用

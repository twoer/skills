# fe-dev Skill

前端开发助手，用于项目初始化和开发工作流管理。

## 命令体系

- **项目初始化**: `/fe-dev:init`、`/fe-dev:claude-init`
- **Feature 工作流**: `/fe-dev:feat-new` → `feat-req` → `feat-design`（可选）→ `feat-gen` → `feat-exec` → `feat-done` → `feat-archive`
- **代码审查与提交**: `/fe-dev:code-review`、`/fe-dev:commit`（`--push` 可推送）、`/fe-dev:gitee-pr`
- **UI 设计稿**: `/fe-dev:ui-setup` → `ui-add` → `ui-gen` → `ui-check`
  - 查看: `/fe-dev:ui`
  - 更新: `/fe-dev:ui-update`
- **Spec 规范**: `/fe-dev:spec-api-sync`、`spec-design`（可选，OpenAPI 预填 4.2）、`spec-req-gen`、`spec-req-exec`

完整命令列表见 `/fe-dev:index` 或 README.md。

## 技术栈

Nuxt 4 + Vue 3 + TypeScript + Element Plus + Tailwind CSS + Scoped SCSS + Pinia

## 语言要求

所有输出统一使用中文，代码和文件路径保持英文。

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
3. Tailwind `@apply`（仅 `<style scoped>` 中用于 hover/focus 状态组合）
4. Scoped SCSS（仅 `:deep()` 和装饰性样式）
5. 禁止：内联 style、全局 SCSS、!important、`<style>` 中裸写 Tailwind class

## 共享文件

- `references/feat-utils.md` — feat-* 系列共享命令和路径
- `references/ui-utils.md` — UI 系列共享约定和 API 调用
- `references/code-review-rules.md` — 代码审查规则清单（Vue 3 + Nuxt 4）

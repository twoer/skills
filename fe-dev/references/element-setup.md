# Element Plus Setup Guide

> **注意：** 所有配置代码（nuxt.config.ts、ESLint、样式等）以 `scripts/init-nuxt4-element.sh` 生成为准，本文档仅作概念参考。

## Overview

基于 AIMarX-Admin 架构的企业级中台方案，使用 Nuxt 4 + Element Plus 构建。

## Tech Stack

### Core Framework
- **Nuxt 4** - Full-stack Vue framework with SSR
- **Vue 3** - Composition API
- **TypeScript** - Strict type checking

### UI & Styling
- **Element Plus** - Enterprise UI component library
- **Tailwind CSS** - Utility-first CSS
- **SCSS** - Component styling and theme customization

### State Management
- **Pinia** - Vue state management

### Rich Features
- **WangEditor** - Rich text editor
- **vue-advanced-cropper** - Image cropping
- **sortablejs** - Drag & drop
- **xlsx** - Excel import/export

### Security & Utilities
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **crypto-js** - Encryption
- **dompurify** - HTML sanitization

### Database
- **mysql2** - MySQL driver

## Project Structure

```
app/
├── assets/
│   ├── icons/svgs/          # SVG icons (auto-imported)
│   └── styles/              # SCSS + Tailwind
│       ├── tailwind.css     # Tailwind directives
│       ├── element.scss     # Element Plus theme
│       ├── index.scss       # Global styles
│       └── variables.scss   # SCSS variables
├── components/
│   ├── image-upload/        # Image upload with cropper
│   ├── wang-editor/         # Rich text editor wrapper
│   └── clip/                # Clipboard utilities
├── composables/             # Reusable composables
├── layouts/
│   └── admin.vue            # Admin layout
├── pages/                   # File-based routing
├── plugins/                 # Nuxt plugins
├── stores/
│   └── auth.ts              # Authentication store
├── types/                   # TypeScript definitions
└── utils/                   # Utility functions

server/
├── api/                     # API routes
├── database/                # Database setup
├── middleware/              # Server middleware
├── services/                # Business logic
└── utils/                   # Server utilities

public/
└── uploads/                 # File upload directory
```

## Key Features

### 1. Element Plus Integration

Full Element Plus component library with custom theme:

```vue
<template>
  <el-button type="primary">Primary</el-button>
  <el-table :data="tableData">
    <el-table-column prop="name" label="Name" />
  </el-table>
</template>
```

主题色通过 `app/assets/styles/element.scss` 自定义，默认主色可在初始化时通过 `PRIMARY_COLOR` 环境变量指定。

### 2. Auto-imports

Components and composables are auto-imported:
```vue
<script setup>
// No imports needed!
const authStore = useAuthStore()
const route = useRoute()
</script>
```

### 3. Authentication

Built-in auth store with JWT support:

```typescript
const authStore = useAuthStore()

// Login
authStore.setAuth(token)
authStore.setUser(userData)

// Check auth
if (authStore.isLoggedIn) {
  // User is authenticated
}

// Logout
authStore.clearAuth()
```

### 4. File Upload

Image upload with cropper component ready to use.

### 5. Rich Text Editor

WangEditor integration for content editing.

### 6. Full-stack API

Server-side API routes in `server/api/`:

```typescript
// server/api/users.ts
export default defineEventHandler(async (event) => {
  return { users: [] }
})
```

## Configuration

### 配置说明

`nuxt.config.ts`、`.env.example`、ESLint、Stylelint、Prettier 等配置文件均由 `scripts/init-nuxt4-element.sh` 生成，支持通过环境变量定制：

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `PRIMARY_COLOR` | 主题主色 | `#3287ff` |
| `DEV_PORT` | 开发服务器端口 | `3001` |
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | `3306` |
| `DB_USER` | 数据库用户 | `root` |
| `DB_NAME` | 数据库名 | `myapp` |

### Styling

样式方案（颜色以 Element Plus 为单一数据源）：

1. **Element Plus SCSS** — 组件主题定制，**颜色的唯一定义处**
2. **Tailwind CSS** — 工具类，颜色通过 `var(--el-*)` 引用 EP 变量
3. **Custom SCSS** — 全局样式和组件样式

## Development Workflow

### Install Dependencies
```bash
npm install
```

### Start Dev Server
```bash
npm run dev
# Opens at http://localhost:3001
```

### Build for Production
```bash
npm run build
npm run preview
```

### Add Element Plus Components

All Element Plus components are available:
- Buttons, Forms, Tables
- Dialogs, Drawers, Popovers
- Date Pickers, Selects
- Upload, Tree, Cascader
- And 60+ more components

See [Element Plus Docs](https://element-plus.org)

## Common Tasks

### Create a New Page

Add file to `app/pages/`:
```vue
<!-- app/pages/users/index.vue -->
<template>
  <div>
    <h1>Users</h1>
    <el-table :data="users">
      <el-table-column prop="name" label="Name" />
    </el-table>
  </div>
</template>

<script setup>
const users = ref([])
</script>
```

### Create an API Endpoint

Add file to `server/api/`:
```typescript
// server/api/users/index.ts
export default defineEventHandler(async (event) => {
  // Your logic here
  return { users: [] }
})
```

### Add a Composable

Create in `app/composables/`:
```typescript
// app/composables/useUsers.ts
export const useUsers = () => {
  const users = ref([])

  const fetchUsers = async () => {
    const data = await $fetch('/api/users')
    users.value = data.users
  }

  return {
    users,
    fetchUsers
  }
}
```

### Customize Theme

编辑 `app/assets/styles/element.scss`，通过 `@forward ... with` 覆盖 Element Plus 的 SCSS 变量来自定义主题色。

## Best Practices

1. **Use Pinia stores** for global state
2. **Use composables** for reusable logic
3. **Keep components small** and focused
4. **Use Element Plus components** for consistency
5. **Follow file-based routing** conventions
6. **Use TypeScript** for type safety
7. **Organize by feature** in larger apps

## Resources

- [Nuxt 4 Documentation](https://nuxt.com)
- [Element Plus Documentation](https://element-plus.org)
- [Pinia Documentation](https://pinia.vuejs.org)
- [Tailwind CSS Documentation](https://tailwindcss.com)

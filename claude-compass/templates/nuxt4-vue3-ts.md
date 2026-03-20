# {项目名称} Development Guidelines

Last updated: {日期}

## Active Technologies

- Nuxt 4 + Vue 3 + TypeScript
- Element Plus (UI)
- Tailwind CSS + Scoped SCSS
- Pinia (状态管理)

## 团队共享规则（通过 .claude/rules/shared/ 自动加载）

<!-- 以下列出本项目加载的共享规则，供开发者参考 -->
{扫描 .claude/rules/shared/ 下所有 .md 文件并列出}

## Project Structure

```text
app/
  assets/styles/      # SCSS + Tailwind CSS
  components/         # Vue components (auto-imported)
  composables/        # Composables (auto-imported)
  layouts/            # Nuxt layouts
  middleware/         # Route middleware
  pages/              # File-based routing
  plugins/            # Nuxt plugins
  stores/             # Pinia stores
  types/              # TypeScript definitions
  utils/              # Utility functions
server/
  api/                # API routes
  utils/              # Server utilities
```

## Frontend Architecture

```
页面 (pages/) → Service (composables/useXxxService.ts) → HTTP (composables/useHttp.ts) → 后端 API
                    ↓
              Store (stores/) ← 只管状态，不调接口
```

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run lint          # ESLint check
npm run lint:fix      # ESLint fix
npm run format        # Prettier format
```

## Code Style

- auto-import: composables, stores, Vue APIs 均自动导入
- 搜索表单统一命名为 `searchFormModel`，使用 `ref`
- API 响应格式：`{ success, message, data?, errorCode? }`

# {项目名称} Development Guidelines

Last updated: {日期}

## Active Technologies

- Vue 3 + TypeScript
- {UI 框架，如 Element Plus / Ant Design Vue}
- {样式方案，如 Tailwind CSS / Scoped SCSS}
- Pinia (状态管理)

## 团队共享规则（通过 .claude/rules/shared/ 自动加载）

<!-- 以下列出本项目加载的共享规则，供开发者参考 -->
{扫描 .claude/rules/shared/ 下所有 .md 文件并列出}

## Project Structure

```text
src/
  assets/           # 静态资源和样式
  components/       # Vue components
  composables/      # Composables (use* 命名)
  router/           # Vue Router 配置
  stores/           # Pinia stores
  types/            # TypeScript definitions
  utils/            # Utility functions
  views/            # 页面视图
```

## Frontend Architecture

```
页面 (views/) → Service (composables/useXxxService.ts) → HTTP 层 → 后端 API
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
npm run test          # Run tests
```

## Code Style

- auto-import: composables, stores, Vue APIs 均自动导入（如已配置 unplugin-auto-import）
- 搜索表单统一命名为 `searchFormModel`，使用 `ref`
- API 响应格式：`{ success, message, data?, errorCode? }`

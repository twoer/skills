# 前端代码审查规则

> 适用技术栈：Nuxt 4 + Vue 3 + TypeScript + Element Plus + Tailwind CSS + Scoped SCSS + Pinia + vue-i18n

## 基础规则

### 置信度与输出要求

1. **只报告有把握的问题**（置信度 >= 80/100），不要猜测
2. **定位精确**：始终引用文件路径和行号
3. **建议可执行**：每个问题必须附带修复建议或改进方案
4. **尊重已有模式**：如果代码库一致使用了某模式，记为建议而非问题
5. **语言一致**：审查结果用中文输出

---

## 一、TypeScript 类型安全

- **禁止 `any` 逃逸**：标记 `as any`、`Record<string, any>`、`(formData as any)[key]` 等用法，建议提供正确的类型替代方案
- **严格空值检查**：关注潜在的 `undefined` / `null` 访问，是否缺少守卫（`?.`、`??`）
- **接口完整性**：新增的 API 字段必须在 TypeScript 接口中有对应更新
- **枚举 vs 联合类型**：跨文件共享的固定集合使用枚举；局部使用的值优先使用联合类型
- **类型收窄**：确保基于可辨识联合的 switch/if 分支覆盖所有情况
- **泛型约束**：检查泛型是否在需要时进行了正确的约束

## 二、Vue 响应式

- **响应式引用选择**：基本类型用 `ref()`，对象用 `reactive()`。混用不当会导致响应式丢失
- **computed 误用**：`computed` 不应有副作用。如果某个"计算属性"会修改状态，应改为 `watch` 或方法
- **watch 陷阱**：
  - 监听响应式对象属性需要 getter 函数：`() => formData.subtype`
  - 对大型对象使用 `{ deep: true }` 可能导致性能问题
  - `{ flush: 'sync' }` 应谨慎使用
- **模板响应式**：确保模板中使用的所有值都是响应式的
- **`v-if` vs `v-show`**：低频切换/重量级组件用 `v-if`；高频切换用 `v-show`
- **`:key` 规范**：`v-for` 的 key 必须唯一且稳定，禁止使用数组索引作为可重排序列表的 key

## 三、组件设计

- **Props 和 Emits**：使用 `defineProps<T>()` 配合类型接口，不使用运行时声明。使用 `defineEmits<T>()`
- **Provide/Inject**：优先使用带类型的注入键
- **组件体积**：`<script setup>` 超过约 300 行是异味——建议拆分
- **Composables**：可复用逻辑应提取为 `use*.ts`，放在 `composables/` 目录
- **模板可读性**：复杂的模板逻辑应提取为 computed 属性

## 四、Element Plus 用法

- **表单验证**：`el-form` 需要 `ref` 和 `:rules` 绑定。验证规则应定义为 `FormRules` 类型常量
- **Dialog/Drawer 清理**：`el-dialog`、`el-drawer` 关闭时应重置表单状态
- **表格性能**：大数据量场景确保 `el-table` 使用 `row-key`，考虑虚拟滚动或分页
- **Select/Cascader 异步加载**：检查 loading 状态处理，远程搜索做防抖
- **消息提示一致性**：统一使用 `ElMessage` / `ElNotification`

## 五、国际化（vue-i18n）

- **禁止硬编码文案**：模板和 `ElMessage` 中所有用户可见文本必须使用 `t('key')` 或 `$t('key')`
- **Key 一致性**：新增 key 时，确保所有语言文件都更新了相同的 key 路径
- **插值语法**：优先使用命名插值 `{name}`，而非列表插值 `{0}`

## 六、性能

- **不必要的重渲染**：模板中内联对象/数组（`:style="{ color: 'red' }"`、`:options="[...]"`）应提取为 computed 或常量
- **大列表**：超过约 100 条且无分页或虚拟滚动的列表需标记
- **模板事件处理**：优先 `@click="handler"` 而非 `@click="handler()"`
- **懒加载**：大型组件或重型库应使用 `defineAsyncComponent()` 或动态 `import()`

## 七、样式

- **作用域样式**：SFC 样式应使用 `<style scoped>`
- **深度选择器**：尽量减少 `:deep()` 使用，优先 CSS 变量或 slot 定制
- **Tailwind 优先级**：class 写在 `<template>` 上，`@apply` 仅在 `<style scoped>` 中用于 hover/focus 组合，禁止内联 style、全局 SCSS、`!important`
- **响应式设计**：检查硬编码像素宽度是否会在小屏幕溢出

## 八、常见 Bug 模式

- **异步竞态**：多个异步请求未做取消处理可能导致过期状态更新
- **内存泄漏**：`window.addEventListener`、`setInterval`、订阅未在 `onBeforeUnmount` 中清理
- **浅拷贝陷阱**：`{ ...reactiveObj }` 嵌套对象仍是共享引用，需深拷贝时用 `structuredClone`

---

## 九、Nuxt 专属规则

### 9.1 Auto-imports

- **禁止手动导入 auto-import 项**：Nuxt 自动导入 Vue API（`ref`、`computed`、`watch` 等）、composables/、utils/、组件。手动 `import { ref } from 'vue'` 是冗余代码，应删除
- **自定义 composables 路径**：只有 `composables/` 顶层文件会被自动导入，嵌套子目录需在 `nuxt.config` 中显式配置或使用 re-export

### 9.2 文件路由（pages/）

- **路由文件命名**：使用 `[id].vue` 动态路由，`[...slug].vue` 捕获全部。禁止手写 vue-router 配置
- **NuxtLink**：站内跳转必须用 `<NuxtLink>` 而非 `<a>` 或 `<router-link>`
- **definePageMeta**：页面级元信息（layout、middleware、title）使用 `definePageMeta()` 而非路由 meta

### 9.3 数据获取

- **useFetch / useAsyncData**：替代 `useRequest` 或手写 `fetch`。它们天然支持 SSR、去重、缓存
- **key 唯一性**：`useAsyncData` 的 key 参数必须全局唯一，避免缓存冲突
- **refresh vs execute**：数据刷新用 `refresh()`，不要重新创建 composable
- **server: false**：仅客户端数据（如依赖 `window` 的）需显式 `{ server: false }`
- **禁止顶层 await 后访问组件实例**：`await` 之后 `getCurrentInstance()` 可能为 null，响应式状态需在 await 前声明

### 9.4 SSR / Hydration

- **浏览器 API 守卫**：`window`、`document`、`localStorage` 等必须在 `onMounted` 或 `import.meta.client` 守卫内使用
- **Hydration 不匹配**：服务端和客户端渲染结果必须一致。条件渲染依赖客户端状态时用 `<ClientOnly>` 包裹
- **`#client` 插件**：仅客户端逻辑的插件文件命名为 `*.client.ts`
- **序列化限制**：`useState` / `useAsyncData` 的值必须可 JSON 序列化（不能存 Date、Map、Set、函数）

### 9.5 中间件（middleware/）

- **命名中间件**：全局中间件用 `*.global.ts`，页面级中间件通过 `definePageMeta({ middleware: ['auth'] })` 引用
- **中间件返回值**：必须返回 `navigateTo()` 或 `abortNavigation()` 来阻断导航，不要返回 `false`
- **异步中间件**：避免在中间件中做重量级异步操作，它会阻塞导航

### 9.6 状态管理

- **useState vs Pinia**：简单跨组件共享状态用 `useState()`；复杂业务逻辑（actions、getters、devtools）用 Pinia
- **useState SSR 安全**：`useState` 值在服务端渲染时会序列化到 HTML payload，注意不要存敏感数据
- **Pinia 初始化**：确保 Pinia store 在 SSR 环境下正确初始化，避免单例状态污染

### 9.7 配置与环境变量

- **runtimeConfig**：运行时变量用 `useRuntimeConfig()`，不要直接读 `process.env`
- **公开 vs 私有**：客户端可访问的配置放 `runtimeConfig.public`，敏感配置放 `runtimeConfig`（仅服务端）
- **appConfig**：构建时确定的非敏感配置用 `app.config.ts` + `useAppConfig()`

### 9.8 Server 目录（server/）

- **API 路由**：`server/api/` 自动映射路由，文件名即路径。使用 `defineEventHandler`
- **输入验证**：`readBody()`、`getQuery()` 的返回值必须校验，不要直接信任
- **错误处理**：使用 `createError({ statusCode, message })` 抛错，不要直接 throw Error

---

## 输出格式

```markdown
## 代码审查报告

### 总结

- 审查文件数: N
- 严重: N 个
- 重要: N 个
- 建议: N 个

### 问题

#### 严重（必须修复）
- [文件:行号] 问题描述 + 修复建议

#### 重要（建议修复）
- [文件:行号] 问题描述 + 修复建议

#### 建议（锦上添花）
- [文件:行号] 问题描述

### 亮点
- 做得好的地方

### 审核结果
✅ 审核通过 | ⚠️ 有告警 (N 条) | ❌ 未通过 (N 严重, N 重要)
```

**严重级别映射：**
- **严重** = error（阻断提交）：安全漏洞、明确 bug、数据丢失风险、SSR hydration 崩溃
- **重要** = warning（告警）：潜在 bug、类型不安全、性能问题、Nuxt 反模式
- **建议** = info（不阻断）：代码改进建议、更优写法

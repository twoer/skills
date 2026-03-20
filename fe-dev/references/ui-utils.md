# UI Skill 共享工具

所有 `fe-dev:ui*` skill 共用的工具函数和约定。

---

## 路径约定

### getUIDir

构造 UI 目录路径。

```bash
docs/features/feat-{featName}/ui/
```

### 路径常量

```
UI_DIR      = {UI_BASE}/
PAGES_JSON  = {UI_BASE}/ui-pages.json
SPECS_DIR   = {UI_BASE}/specs/
```

### specPath

构造 spec 文件路径。

```
{SPECS_DIR}/{pageId}-spec.md
```

---

## 状态枚举

```typescript
type PageStatus = "pending" | "spec-done" | "converted" | "reviewed"
```

状态流转：`pending` → `spec-done` → `converted` → `reviewed`

| 状态 | 含义 | 触发命令 |
|------|------|---------|
| pending | 已注册，未分析 | ui-add 创建条目时 |
| spec-done | spec 已生成，待确认 | ui-add 完成时 |
| converted | 代码已生成 | ui-gen 完成时 |
| reviewed | 质检通过 | ui check 通过时 |

---

## ui-pages.json 操作

### initPagesJson

如果 `ui-pages.json` 不存在，从 `<skill-path>/templates/ui-pages.json` 创建初始文件。

### getPage

按 `pageId` 在 `pages` 数组中查找页面记录。

### updatePageStatus

更新指定页面的 `status` 和 `updatedAt` 字段。

### addPage

添加新页面条目：

```json
{
  "id": "{pageId}",
  "name": "{name}",
  "mastergo": "{url}",
  "target": "{targetPath}",
  "status": "spec-done",
  "createdAt": "{ISO date}",
  "updatedAt": "{ISO date}",
  "tokens": {
    "element-plus": {},
    "tailwind": {},
    "scoped": {}
  }
}
```

---

## MCP 调用约定

### 设计稿获取策略

**仅 MasterGo，两步降级，无图片分析兜底。**

```
1. 尝试 getD2c（最佳，直接生成代码）
   - 工具：mcp__mastergo__mcp__getD2c
   - 参数：contentId, documentId（从 URL 提取）
   - 成功 → 使用返回的 code 字段
   - 失败且参数含特殊字符（如 `:`）→ URL 编码后重试一次

2. 尝试 getDsl（结构化节点树）
   - 工具：mcp__mastergo__mcp__getDsl
   - 参数：shortLink（直接传入 URL）
   - 成功 → AI 分析 DSL 节点树
   - 失败且 URL 含特殊字符 → URL 编码后重试一次

3. 两者均失败 → 报错退出，提示用户检查 URL 或网络
```

### URL 编码重试

当 MCP 调用返回空或报错时，检查参数中是否包含 `:` 等特殊字符（常见于 MasterGo 的 `layer_id`），如果有，将特殊字符替换为 URL 编码（如 `:` → `%3A`）后重试一次。

### URL 解析

- 短链格式：`https://mastergo.iflytek.com/goto/RuscHDVn`
- 文件格式：`https://mastergo.iflytek.com/file/{fileId}?layer_id={layerId}`
- contentId 从短链路径或 D2C URL 中提取

### 预留扩展

未来非 MasterGo 来源可使用图片分析：
- 工具：`mcp__4_5v_mcp__analyze_image`
- 条件：`source != "mastergo"`

---

## 代码生成规则

### 样式优先级（从高到低）

1. **Element Plus 组件** — 优先使用 EP 内置组件
2. **Tailwind CSS class** — 布局、间距、响应式、文字
3. **Scoped SCSS** — 仅用于 `:deep()` 覆盖和装饰性样式
4. **禁止** — 内联 style、全局 SCSS、!important

### Element Plus 组件映射

| 场景 | 组件 |
|------|------|
| 表单 | ElForm, ElFormItem, ElInput, ElSelect, ElDatePicker, ElRadio, ElCheckbox, ElSwitch, ElUpload |
| 数据展示 | ElTable, ElTableColumn, ElPagination, ElDescriptions, ElStatistic |
| 反馈 | ElDialog, ElMessageBox, ElMessage, ElNotification, ElDrawer |
| 导航 | ElMenu, ElMenuItem, ElBreadcrumb, ElTabs, ElTabPane, ElDropdown |
| 通用 | ElButton, ElCard, ElTag, ElBadge, ElTooltip, ElAvatar, ElDivider, ElEmpty, ElSkeleton |

### Tailwind 常用 class

| 用途 | class |
|------|-------|
| 布局 | flex, grid, gap-*, items-center, justify-between |
| 间距 | p-*, m-*, space-x-*, space-y-* |
| 尺寸 | w-*, h-*, min-h-screen, max-w-* |
| 响应式 | sm:, md:, lg:, xl: |
| 文字 | text-*, font-*, leading-*, tracking-* |
| 显示 | hidden, block, flex, grid |
| 圆角 | rounded, rounded-lg, rounded-xl, rounded-2xl |
| 阴影 | shadow, shadow-sm, shadow-md, shadow-lg |

### Scoped SCSS 允许场景

- Element Plus 组件样式覆盖（**必须**使用 `:deep()`）
- 装饰性样式（渐变背景、模糊效果、动画 keyframes）
- CSS 变量定义（`--shadow-card`、`--blur-deco` 等）

---

## 质检规则

### 核心规则（error 级别）

- 无内联 `style="..."` 属性
- `<style>` 标签必须有 `scoped` 属性
- 表单字段必须有 `label` 或 `aria-label`

### 交互规则（warning 级别）

- 可点击元素（`<a>`、`<button>`、有 `@click` 的元素）应有 `cursor-pointer` class
- hover 状态应有 `transition`（150-300ms）
- 颜色变化应有 `transition: color 200ms` 而非 `transition: all`

### 可访问性（warning 级别）

- 文字对比度 >= 4.5:1
- `<img>` 必须有 `alt` 属性
- `focus` 状态可见

### 项目规则（info 级别）

- 优先使用 Element Plus 组件而非手动实现
- Tailwind class 优先于 SCSS
- scoped SCSS 中无全局样式泄漏（无未加前缀的选择器）

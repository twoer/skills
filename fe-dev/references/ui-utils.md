# UI Skill 共享约定

## 路径约定

```
UI_DIR      = docs/features/feat-{featName}/ui/
PAGES_JSON  = {UI_DIR}/ui-pages.json
SPECS_DIR   = {UI_DIR}/specs/
```

- `{pageId}` = name 参数的 kebab-case 值
- DSL 路径：`{SPECS_DIR}/{pageId}-dsl-raw.json`

## 状态枚举

```typescript
type PageStatus = "draft" | "done"
```

- `draft`：已注册，未完成代码生成
- `done`：代码已生成

## ui-pages.json

- 不存在时从 `<skill-path>/templates/ui-pages.json` 创建
- 条目格式：`{ id, name, mastergo, target, status, createdAt, updatedAt }`

## MasterGo API

配置：`<skill-path>/config/mastergo.json`（`pat`、`base_url`）。缺失提示运行 `/fe-dev:ui-setup`。

### fetchDsl

```bash
curl -s -o {output_path} \
  -H "X-MG-UserAccessToken: {pat}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "{base_url}/mcp/dsl?fileId={fileId}&layerId={layerId}"
```

### URL 解析

**文件链接**：`https://mastergo.iflytek.com/file/{fileId}?layer_id={layerId}`
- fileId: 正则 `/file/([^/?]+)`；layerId: URL decode，含 `/` 只取首段

**短链**：`https://mastergo.iflytek.com/goto/XXXXX`
- 不能带 PAT header（否则 404）：
  ```bash
  REDIRECT_URL=$(curl -s -o /dev/null -w "%{redirect_url}" "https://mastergo.iflytek.com/goto/XXXXX")
  FILE_ID=$(echo "$REDIRECT_URL" | sed -n 's|.*/file/\([^/?]*\).*|\1|p')
  LAYER_ID=$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1]))" "$(echo "$REDIRECT_URL" | sed -n 's|.*layer_id=\([^&]*\).*|\1|p')")
  ```
- 解析失败 → 报错提示使用文件链接

### 错误处理

| 状态码 | 处理 |
|--------|------|
| 200 | 继续 |
| 401/403 | 提示重新 `/fe-dev:ui-setup` |
| 404 | 提示检查 URL |
| 500 | 提示稍后重试 |

## 代码生成规则

### 样式优先级

1. Element Plus 组件
2. Tailwind CSS class（**必须写在 `<template>` class 属性上**）
3. Scoped SCSS（仅 `:deep()` 和装饰性样式）
4. 禁止：内联 style、全局 SCSS、!important、`<style>` 中裸写 Tailwind

### EP 组件默认属性

| 组件 | 默认属性 |
|------|---------|
| ElInput | `clearable` |
| ElSelect | `clearable` + `filterable` |
| ElDatePicker | `clearable` |

EP 组件内部默认 nowrap，长文本场景需 `:deep()` 覆盖 `white-space: normal`。

### 图标/SVG

1. 优先使用设计稿资源
2. nuxt-svgo 项目 → 自动导入组件（`<ICommonLogo />`），目录 `app/assets/icons/svgs/{分类}/`
3. 非 nuxt-svgo → 图片引用（`./assets/images/xxx.svg`）
4. 禁止用 EP 图标替代设计稿自定义图标/Logo（资源提取失败时才允许临时替代，记入 TODO）

# UI Skill 共享约定

## 分支检查

所有 UI skill 执行前必须检查当前分支：
```bash
git branch --show-current
```
不以 `feat/` 开头则**停止执行并提示用户切换**，不自动创建分支。即使用户要求跳过分支检查也不允许——因为 `UI_DIR` 路径依赖分支名推导 `featName`，跳过会导致文件路径不一致。

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
- 条目格式：`{ id, name, mastergo, target, tokens, status, createdAt, updatedAt }`

## MasterGo API

配置：`<skill-path>/config/mastergo.json`，按域名存储多组凭证。缺失提示运行 `/fe-dev:ui-setup`。

### 配置查找

从设计稿 URL 中提取域名，匹配 `accounts` 中的对应条目：

```javascript
// 伪代码
const config = JSON.parse(readFile('<skill-path>/config/mastergo.json'))
const hostname = new URL(designUrl).hostname  // 如 "mastergo.iflytek.com"

// 兼容旧格式（顶层 pat 字段）
if (config.pat && !config.accounts) {
  const oldHost = new URL(config.base_url).hostname
  config = { accounts: { [oldHost]: { pat: config.pat, noproxy: config.noproxy } } }
}

const account = config.accounts[hostname]
if (!account) → 提示运行 `/fe-dev:ui-setup` 配置该域名的 PAT
```

### fetchDsl

```bash
# {pat} 和 {noproxy} 从上面匹配的 account 中获取
NOPROXY_FLAG=""
# 如果 account.noproxy 为 true
NOPROXY_FLAG="--noproxy '*'"

curl -s $NOPROXY_FLAG -o {output_path} \
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
  LAYER_ID=$(node -e "console.log(decodeURIComponent(process.argv[1]))" "$(echo "$REDIRECT_URL" | sed -n 's|.*layer_id=\([^&]*\).*|\1|p')")
  ```
- 解析失败 → 报错提示使用文件链接

### 错误处理

| 状态码 | 处理 |
|--------|------|
| 200 | 继续 |
| 401/403 | 提示重新 `/fe-dev:ui-setup` |
| 404 | 提示检查 URL |
| 500 | 提示稍后重试 |

## 代码生成约定（简要）

以下为项目级约定，供 ui-gen 引用。样式细节和 DSL 解读由 LLM 工程能力直接完成，不在此重复。

### 样式分层

1. 布局样式（flex/grid/gap/padding/margin/size/radius/bg）→ **Tailwind class 写在 `<template>`**
2. `:deep()` 覆盖 EP 组件内部 + 装饰性样式（hover/transition）→ **Scoped SCSS**
3. 禁止：内联 style、全局 SCSS、`<style>` 中手写 `!important`（Tailwind 的 `!` 前缀如 `!w-[274px]` 允许使用，用于覆盖 EP 组件默认样式）

### EP 组件默认属性

ElInput `clearable` / ElSelect `clearable filterable` / ElDatePicker `clearable`

### EP 组件宽度

EP 组件（ElSelect、ElDatePicker、ElInput 等）默认 `width: 100%`。在 flex 容器中不要写死像素宽度，用弹性布局控制：

```html
<!-- 正确 — flex 容器中用弹性宽度 -->
<div class="flex flex-wrap gap-4">
  <el-select class="min-w-[200px] flex-1" />
  <el-date-picker class="min-w-[200px] flex-1" />
</div>

<!-- 错误 — 写死像素，不响应 -->
<el-select class="!w-[274px]" />
```

仅在需要精确固定宽度时（如独立行的单个输入框）才用 `!w-[Npx]`。

### EP 组件 size 映射

DSL 中组件高度必须映射为正确的 `size` prop，不能依赖默认值：

| DSL 高度 | size prop | 说明 |
|----------|-----------|------|
| 24px | `size="small"` | |
| 32px | `size="default"` | 可省略 |
| 40px | `size="large"` | |
| 其他 | `size="large"` + `:deep()` 覆盖高度 | 如 48px 按钮 |

适用组件：ElInput、ElSelect、ElDatePicker、ElButton、ElInputNumber 等所有支持 `size` 的组件。

**生成规则**：读取 DSL 中组件节点的 `layoutStyle.height`，查上表选择 size prop。精确匹配优先，不匹配时选最近的 size 再用 scoped SCSS 微调。

### 图标/SVG

- **必须使用设计稿 SVG 资源** — resources.json 中的 SVG 通过 `export-svgs` 导出后，在代码中用 `<img>` 或 nuxt-svgo 组件引用
- nuxt-svgo 项目：SVG 导出到 `app/assets/icons/svgs/{分类}/`，代码中自动导入为组件
- 非 nuxt-svgo 项目：SVG 导出到 `app/assets/images/`，用 `<img src="~/assets/images/{name}.svg" />` 引用
- **严禁用 EP 图标替代设计稿自定义图标**（Wallet/Money/ShoppingCart 等 EP 图标不能替代设计稿中的自定义图标）
- 仅 EP 组件内置功能图标（ElSelect 箭头、ElDatePicker 日历等）无需替代
- 只有 `export-svgs` 命令执行失败时才允许临时用 EP 图标替代，且必须记入 TODO

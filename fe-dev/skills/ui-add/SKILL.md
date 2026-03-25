---
name: ui-add
description: 分析 MasterGo 设计稿，生成设计规格文档。触发词: "ui add", "添加设计稿", "设计分析", "ui-add"
allowed-tools: Read, Grep, Glob, Bash
---

# UI Add - 设计稿分析

分析 MasterGo 设计稿，提取设计信息，生成结构化的 design-spec.md。

> 共享工具: `<skill-path>/references/ui-utils.md`
> **语言要求**：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

### 步骤 1: 获取 feat 名称

```bash
git branch --show-current
```

不以 `feat/` 开头则提示用户切换到功能分支。

### 步骤 2: 解析参数

| 参数 | 必填 | 说明 |
|------|------|------|
| url | 是 | MasterGo 设计稿 URL（短链或文件链接） |
| name | 是 | 页面标识名（kebab-case，如 `login`、`user-list`） |
| target | 否 | 目标 .vue 文件路径（如 `pages/login/index.vue`），不填则根据 name 推断 |

**参数校验**：如果 `name` 缺失，**立即**使用 AskUserQuestion 询问用户，不进入后续步骤。

> **⚠️ 重要**：步骤 3（初始化 UI 目录）必须在步骤 4（获取设计数据）之前执行，确保目录结构就绪后再请求数据。

### 步骤 3: 初始化 UI 目录

检查 `{UI_DIR}/ui-pages.json` 是否存在：

- 存在 → 读取现有内容
- 不存在 → 从 `<skill-path>/templates/ui-pages.json` 创建，同步创建 `specs/` 子目录

### 步骤 4: 获取设计数据并保存 DSL

**4a. 读取 MasterGo 配置**

读取 `<skill-path>/config/mastergo.json`，获取 `pat` 和 `base_url`。
- 文件不存在或 `pat` 为空 → 提示用户先运行 `/fe-dev:ui-setup`，然后退出。

**4b. 解析 URL**

从用户提供的 `url` 参数中提取 fileId 和 layerId（详见 ui-utils.md "URL 解析"）：
- 文件链 `https://mastergo.iflytek.com/file/{fileId}?layer_id={layerId}` → 正则提取 fileId，URL decode layerId（含 `/` 只取首段）
- 短链 `https://mastergo.iflytek.com/goto/XXXXX` → 通过 `curl -s -o /dev/null -w "%{redirect_url}"` 解析 redirect（不带 PAT header）获取 fileId + layerId；失败则报错提示使用文件链接（详见 ui-utils.md "URL 解析"）

**4c. 调用 DSL API**

```bash
curl -s -o {UI_DIR}/specs/{pageId}-dsl-raw.json \
  -H "X-MG-UserAccessToken: {pat}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "{base_url}/mcp/dsl?fileId={fileId}&layerId={layerId}"
```

用 `-o` 直接写入文件，避免大响应撑爆 Bash 输出。

**错误处理**（通过检查 HTTP 状态码或文件内容判断）：
- 401/403 → 提示 PAT 无效，重新运行 `/fe-dev:ui-setup`
- 404 → 提示 URL 错误，检查 fileId/layerId
- 非 200 → 报错退出

**4d. 预览 DSL 数据**

读取 `{UI_DIR}/specs/{pageId}-dsl-raw.json` 的前 200 行，输出给用户预览，同时说明文件总大小。

**4e. 失败处理**

API 调用失败时，输出错误信息并退出：

```
❌ 无法获取设计稿数据。请检查：
- URL 是否正确（推荐使用文件链接格式，包含 layer_id）
- PAT 是否有效（运行 /fe-dev:ui-setup 重新配置）
- 是否有 MasterGo 访问权限
```

### 步骤 5: 分析设计数据

AI 分析获取到的设计数据（从步骤 4 保存的 `{UI_DIR}/specs/{pageId}-dsl-raw.json` 读取），提取以下信息：

**5a. 语义分析（前置步骤）**

在提取 tokens 和映射组件之前，先对 DSL 节点树进行语义化解读：

1. **PascalCase 语义命名**：为每个关键节点赋予符合工程直觉的名称
   - 包含标题和段落的区域 → `ArticleContent`，而不是 `Frame123`
   - 名为 `icon/search` 的矢量 → `SearchIcon`
2. **类型标注**：在节点名称旁标注角色 — `(页面)`、`(容器)`、`(卡片)`、`(按钮)`、`(文本)`、`(图标)`、`(图片)`、`(输入框)`、`(导航)`
3. **文本提取**：文本节点用 `[内容]` 标注 — `MenuItem (菜单项) [首页]`
4. **智能合并**：忽略或合并纯粹用于设计定位的无意义包裹层（无背景色、无边框、仅用于间距调整的 FRAME），生成反映代码结构的干净树
5. **INSTANCE 识别**：标记 DSL 中的 INSTANCE 节点，记录其对应的组件类型
6. **叠加检测**：对比节点的视觉边界（`bounds` / `layoutStyle`），当文本/Logo 节点的边界与图片/容器节点重叠时，标记为**覆盖层关系**（overlay），而非兄弟关系。覆盖层在组件树中标注为 `(覆盖层)`。**必须**在 spec 的"布局结构"语义组件树中，以 `[x={n}, y={n}]` 的格式记录覆盖层相对于其父容器的精确定位坐标（从 `bounds.x`、`bounds.y` 提取），例如：`HeroText (覆盖层) [x=40, y=100]`
7. **资源节点记录**：对标注为 `(图标)` 或 `(图片)` 的节点，额外记录其 DSL 节点 ID、资源类型和视觉属性，写入 spec 的"资源清单"部分：
   - `type: "LAYER"` + `fill` 含 `url` → 图片资源（PNG/JPG）
   - `type: "PATH"` / `SVG_ELLIPSE` → SVG 矢量资源
   - `type: "INSTANCE"` + 名称含 `icon` → 组件图标（检查是否有可提取的矢量内容）
   - `type: "SVG_ELLIPSE"` → 额外提取 `layoutStyle`（尺寸，如 56x56）和 `fill` 引用的实际颜色值（通过 `styles` 字典解析引用，详见 ui-utils.md），记录格式：`SVG_ELLIPSE (56x56, fill=#F1FDFA)`
   - `type: "FRAME"` 且子节点包含 PATH/SVG_ELLIPSE 的图标容器 → 额外提取容器尺寸和子 PATH 的 fill 颜色，记录格式：`FRAME (36x36, icon-wrapper)`

8. **PATH/SVG 背景节点解析**：对 DSL 中的 PATH 和 SVG_ELLIPSE 节点执行特殊解析，提取隐含的视觉属性（详见 ui-utils.md "DSL 特殊节点解析规则"）：

   **PATH 背景圆角提取**（适用于名称含"背景"、"模块"、"card"、"容器"等语义的 PATH 节点）：
   - 当节点无直接 `borderRadius` 属性时，从 SVG path data 中解析圆角值
   - 解析规则：读取 `path.data`，匹配模式 `M{n} {y} L...`，`M` 后第一个数字即为圆角半径
   - 提取结果标注到语义组件树中：`FilterSection (容器) [radius=8px, shadow=0px 0px 4px...]`

   **Effect 阴影提取**（适用于含有 `effect` 字段的 PATH/FRAME 节点）：
   - 读取节点的 `effect` 引用 key，在 `styles` 字典中解析实际 `box-shadow` 值
   - 空数组 `[]` = 无阴影，不应生成 token
   - 提取结果同样标注到语义组件树中

输出语义化组件树（保存到 spec 的"布局结构"部分）：

```
└── PageRoot (页面)
    ├── HeaderNav (头部导航)
    │   ├── Logo (图标)
    │   └── NavMenu (导航菜单)
    │       ├── MenuItem (菜单项) [首页]
    │       └── MenuItem (菜单项) [产品]
    ├── HeroSection (主内容区)
    │   ├── HeroTitle (标题) [欢迎使用我们的产品]
    │   └── CTAButton (按钮) [立即体验]
    └── Footer (页脚)
```

> 此步骤的输出将作为后续 tokens 提取、布局识别、组件映射的输入，提升各环节的准确性。

**5b. 提取语义 Design Tokens**

按两层分组：

| 层级 | 说明 | 示例 |
|------|------|------|
| Element Plus 主题 | 颜色/圆角等映射到 `--el-*` 变量 | `--el-color-primary: #02B3D6` |
| Scoped SCSS | 页面级装饰性值 | `--shadow-card: 0px 20px...` |

注意：
- 提取的是**语义 tokens**（品牌色、背景色、圆角等），不是原始 DSL 节点值
- **颜色类 token 只写入 Element Plus 主题层**，不重复定义 Tailwind 扩展色值。Tailwind 通过引用 `var(--el-*)` CSS 变量消费颜色，保持单一数据源（详见 ui-gen 步骤 9b）
- 非颜色的 Tailwind 扩展 token（如字体、间距 scale）仍可单独定义

**border-radius 提取规则**：

| 优先级 | 来源 | 提取方式 |
|--------|------|---------|
| 1 | 节点的 `borderRadius` CSS 属性 | 直接读取（FRAME/LAYER/INSTANCE） |
| 2 | 父 PATH 背景节点的 SVG path data | 按步骤 5a 规则 8 解析 `M{n}` 模式 |
| 3 | 推断为 0 | 无上述来源时 |

**shadow/effect 提取规则**：

阴影效果在 DSL 中使用间接引用（详见 ui-utils.md "Effect/Shadow 引用解析"），提取时**必须**解析引用链：

1. 读取节点的 `effect` 字段（如 `"effect_2:06660"`）
2. 在 DSL 顶层 `styles` 字典中查找：`styles["effect_2:06660"].value`
3. `value` 是 CSS 字符串数组：空数组 `[]` → 无阴影；非空数组 → 提取实际 `box-shadow` 值
4. **禁止**使用其他节点的 effect 值作为替代
5. 提取结果映射为 Scoped SCSS token，记录实际 shadow 值（如 `0px 0px 4px 0px rgba(17, 64, 115, 0.12)`），而非 EP 变量值

**5c. 识别布局结构**

描述页面整体布局：
- 分栏方式（左右/上下/嵌套）
- 各区域占比和内容
- 响应式行为（如有）

**5d. 映射组件**

将设计稿中的 UI 元素映射到 Element Plus 组件，同时提取影响布局的关键属性：

- 输入框 → ElInput
- 下拉选择 → ElSelect
- 按钮 → ElButton
- 表格 → ElTable
- 弹窗 → ElDialog
- 等等（详见 ui-utils.md 组件映射表）

同时标注每个组件区域应使用的 Tailwind class。

需提取的 EP 属性（按组件类型）：

**通用尺寸映射（Button、Input、Select、DatePicker、Radio、Checkbox）：**

| EP 预设尺寸 | 实际高度 | 设计稿高度匹配 |
|------------|---------|-------------|
| `large` | 40px | ≥40px → `size="large"` |
| `default` | 32px | 32px → `size="default"` |
| `small` | 24px | ≤24px → `size="small"` |
| 不匹配 | — | 非 24/32/40px 时，选最接近的 size + 记录 `height-override` |

**尺寸不匹配处理**：当设计稿高度不等于任何 EP 预设值（如 36px、28px），在 spec 的组件区域标注 `height-override: {n}px`，供 ui-gen 生成 `:deep()` 高度覆盖。

| 组件 | 需提取的属性 | 像素值映射规则 |
|------|------------|-------------|
| ElForm | `label-position`, `label-width`, `inline` | label 与 input 上下排列 → `label-position="top"` |
| ElButton | `type`, `size`, `plain`, `round`, `loading` | 按通用尺寸映射；border-radius ≥ 高度/2 → `round` |
| ElDialog | `width`, `fullscreen`, `title` | frame 宽度直接取 px 值，如 `width="520px"` |
| ElInput | `size`, `clearable`, `show-password`, `type` | 按通用尺寸映射；高度 >60px → `type="textarea"`；默认 `clearable` |
| ElSelect | `size`, `clearable`, `multiple`, `filterable` | 按通用尺寸映射；默认 `clearable` + `filterable` |
| ElTable | `border`, `stripe`, `size` | 有边框线 → `border`；交替行背景色不同 → `stripe` |
| ElTableColumn | `align` | 按列数据类型推断（见下方"ElTableColumn 对齐规则"） |
| ElDatePicker | `type`, `size`, `clearable` | 按通用尺寸映射；默认 `clearable` |
| ElPagination | `background`, `small` | - |
| ElSwitch | `size` | 高度 ≥28→`large`, 20-27→`default`, <20→`small` |
| ElRadio / ElCheckbox | `size` | 按通用尺寸映射 |

**ElTableColumn 对齐规则（按列数据类型自动推断 `align`）：**

无需设计稿明确标注，根据列的字段名称、类型或表头文字推断：

| 列数据类型 | 推断条件 | `align` 值 |
|-----------|---------|-----------|
| 数字 / 金额 | 字段名含 `amount`、`price`、`fee`、`count`、`num`、`total`、`qty`、`money`；或表头含"金额"、"数量"、"价格"、"费用"、"合计" | `right` |
| 日期 / 时间 | 字段名含 `date`、`time`、`at`（如 `createdAt`）；或表头含"日期"、"时间" | `center` |
| 枚举 / 状态 | 字段名含 `status`、`type`、`state`、`level`；或表头含"状态"、"类型"、"等级" | `center` |
| 操作列 | 表头为"操作"、"Action"、"action" | `center` |
| 其他（文本、ID 等） | 默认 | 不设置（EP 默认左对齐） |

属性提取规则：
- 只在设计稿中能明确判断时才记录，无法判断的属性不填写（使用 Element Plus 默认值）
- 尺寸属性优先从 DSL 节点的 `height` / `bounds.height` 中读取像素值进行映射

**文本换行属性提取（通用规则）：**

从 DSL TEXT 节点提取 `textMode` 字段，记录到 spec 组件清单的"文本换行"列中：
- `textMode: "single-line"` → 填写 `—`（不换行，保持 EP 默认）
- `textMode: "multi-line"` 或缺失，且组件为 ElCheckbox / ElRadio / ElButton / ElTag 等内部默认 nowrap 的组件 → 填写覆盖选择器，如 `.el-checkbox__label { white-space: normal }`
- 普通文本节点（非 EP 组件内部）→ 填写 `—`（交由 ui-gen 按 Auto Layout 推断）

**5e. 提取字段和校验规则**

从表单类组件中提取：
- 字段名、类型
- 对应的 Element Plus 组件
- 校验规则（required、min/max、pattern 等）
- 尝试关联项目中的 TypeScript 类型

**5f. 描述交互行为**

从按钮、链接等可交互元素中提取：
- 触发条件
- 执行动作（提交、跳转、弹窗等）
- 预期关联的 service 方法

### 步骤 6: 自动发现项目上下文

**6a. 发现 Types**

根据步骤 5d 提取的字段名，在项目中搜索匹配的 TypeScript 类型：

```bash
# 搜索 interface 和 type 定义
grep -rn "interface\|type" app/types/ --include="*.ts"
```

将匹配到的类型记录到 spec 的"项目上下文"部分。

**6b. 发现 Services**

根据步骤 5e 的交互描述，搜索匹配的 composable：

```bash
# 搜索 useXxxService
grep -rn "use.*Service" app/composables/ --include="*.ts"
```

**6c. 查找参考页面**

如果 target 指向的 .vue 文件已存在，将其作为参考页面记录到 spec 中。

### 步骤 7: 生成 design-spec.md

基于模板 `<skill-path>/templates/design-spec.md`，填充步骤 5-6 的分析结果，写入：

```
{UI_DIR}/specs/{pageId}-spec.md
```

**必须填充的资源清单**：将步骤 5a 中识别的所有资源节点（图标、图片）填入模板的"资源清单"表格，包括语义名、类型、DSL 节点 ID、用途、**视觉属性**（尺寸、fill 颜色等）、处理方式。对于图标类资源：
   - SVG_ELLIPSE 图标背景 → 记录尺寸和颜色，如：`56x56, fill=#F1FDFA`
   - FRAME 图标容器 → 记录尺寸，如：`36x36`
   - PATH 图标形状 → 记录 fill 颜色（如有）
此清单是 ui-gen 步骤 5 下载资源的直接依据。

**业务需求章节**：模板中包含"业务需求"空章节（校验规则、错误处理、条件逻辑、状态管理四个空表格）。ui-add 阶段不填充此章节，由 ui-gen 步骤 3.5 从 plan.md 自动增强，或由开发者手动填写。

### 步骤 8: 更新 ui-pages.json

在 `pages` 数组中添加新条目：

```json
{
  "id": "{pageId}",
  "name": "{name}",
  "mastergo": "{url}",
  "target": "{targetPath}",
  "status": "spec-done",
  "createdAt": "{当前时间}",
  "updatedAt": "{当前时间}",
  "tokens": {
    "element-plus": { ... },
    "scoped": { ... }
  }
}
```

如果 pageId 已存在且状态为 `converted`，提示用户是否要覆盖（会重置为 spec-done）。

### 步骤 9: 输出摘要

```
✅ 设计规格已生成
📄 Spec: {UI_DIR}/specs/{pageId}-spec.md
📋 页面注册表: {UI_DIR}/ui-pages.json
🎨 提取 tokens: EP({n}) + SCSS({n})
🔗 发现 types: {列表}
🔗 发现 services: {列表}

请审查 spec 文件，确认后执行 /fe-dev:ui-gen 生成代码。
```

> **完整流程**：`/fe-dev:ui-add` → `/fe-dev:ui-gen` → `/fe-dev:ui-check`
```

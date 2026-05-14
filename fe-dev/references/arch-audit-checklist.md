# 架构审计清单

> 用于 `/fe-dev:arch-audit` 的 6 项检查规则。
>
> **定位**：宏观体检（架构 / 规范 / 配置 / 最佳实践），与 `code-review` 的"行级 diff 审查"互补，**不重叠**。
> **置信度门槛**：≥ 80% 才报告，不猜测。
> **输出严重度**：🔴 critical / 🟡 major / 🔵 minor / ⚪ architectural（仅建议，不自动改）。

---

## 一、技术架构 / 技术栈主流性

### 1.1 新引入依赖的合理性 🟡 major

**检测**（使用 SKILL 步骤 2 中确定的 commit 范围变量 `<base>..HEAD`，避免 `HEAD~3` 在小仓库失败）：

```bash
git diff <base>..HEAD -- package.json | grep -E '^\+\s+"[^"]+"\s*:'
```

**判断**：

- 新依赖是否已被既有依赖覆盖（如同时存在 `axios` + `ofetch`、`lodash` + `lodash-es`、`dayjs` + `moment`）
- 新依赖最近 12 个月是否有发版（停止维护风险）
- 是否引入了与当前技术栈冲突的方案（如 Nuxt 4 项目引入 Next.js 专属库）

**输出**：列出新增依赖及风险评估，未命中则标 ✅。

### 1.2 目录结构异动 ⚪ architectural

**检测**（沿用 SKILL 步骤 2 的 `<changed_files>`）：

```bash
echo "$<changed_files>" | grep -E '^(app|server|components|composables|stores|pages|layouts|middleware|plugins|utils|types|services)/' | awk -F/ '{print $1}' | sort -u
```

**判断**：

- 是否在已有目录约定外新建顶级目录（如 Nuxt 4 项目出现 `src/` 或 `lib/`）
- 是否打破 `app/` 与 `server/` 分层
- 是否把业务逻辑放到 `utils/` 等本应只放纯工具的目录

**输出**：仅作 architectural 建议，不阻断。

---

## 二、CLAUDE.md 规则符合度

> 前置：项目根目录 `CLAUDE.md` 存在。否则本项跳过。

### 2.1 硬规则违反 🔴 critical

读取项目 `CLAUDE.md`，提取所有"禁止 / 不允许 / must not / forbidden"语句，逐条比对变更文件：

- 禁止用法是否出现在变更代码中
- 禁止的目录、文件名模式
- 禁止的导入路径（如 `import from '@/legacy/*'`）

**输出**：命中的违反项 → critical，附文件:行号 + CLAUDE.md 中对应的原文引用。

### 2.2 推荐规范偏离 🟡 major

读取 CLAUDE.md 中"推荐 / 优先 / should / 约定"语句：

- 推荐用法未采用（如 CLAUDE.md 写"优先 Element Plus 组件"但变更里裸写了原生 `<input>`）
- 命名约定偏离（如 CLAUDE.md 要求 `use*` 前缀但 composable 命名不符）

**输出**：major，附文件:行号 + 建议改写。

### 2.3 路径约定违反 🟡 major

按 CLAUDE.md 中的路径约定检查（fe-dev 项目示例：`docs/features/feat-{name}/`）：

- 新建文件是否放对位置
- 跨域引用是否绕过分层

---

## 三、Vue 最佳实践（含 style）

> 仅审 `.vue` 文件。

### 3.1 响应式陷阱 🔴 critical / 🟡 major

| 模式 | 严重度 | 检测要点 |
|---|---|---|
| `watch(formData.subtype, ...)` 直接传响应式属性 | major | 缺 getter，只触发一次 |
| `computed` 中包含赋值/请求 | critical | computed 不应有副作用 |
| `reactive(primitiveValue)` 包装基本类型 | major | 应改用 `ref()` |
| 模板内大量内联对象 `:style="{ color }"` | minor | 提取 computed |

### 3.2 生命周期清理 🔴 critical

变更中出现 `setInterval` / `setTimeout` / `addEventListener` / `subscribe` 时：

- 是否在 `onBeforeUnmount` / `onUnmounted` 清理
- Composable 内是否暴露清理函数或自身处理

**检测**：

```bash
grep -nE 'setInterval|setTimeout|addEventListener' <changed_vue_files>
```

对每处 hit 检查同文件是否有对应的 clear / remove。

### 3.3 v-for / v-if 反模式 🟡 major

- `v-for` 使用 index 作为 key 且列表可重排序
- 同元素 `v-if` + `v-for`（v-if 应外移）

### 3.4 样式优先级 🟡 major

按 fe-dev CLAUDE.md 优先级（Element Plus > Tailwind class > `@apply` > Scoped SCSS）检查：

- 内联 `style="..."` → major
- 全局 SCSS（无 `scoped`） → major
- `!important` → major
- `<style>` 中裸写 Tailwind class（不在 `@apply` 内） → major

### 3.5 组件体积 🔵 minor

`<script setup>` 区块 > 300 行 → 提示拆分。

---

## 四、公共常量提取

### 4.1 数字字面量 🟡 major

变更中检测：

```bash
# 排除 0/1/2/-1/数组索引等常见值
grep -nE '\b([3-9]|[1-9][0-9]+|0\.[0-9]+)\b' <changed_files>
```

判定"应抽常量"的模式：

- 同一数值在 2+ 处出现
- 出现在 `setInterval` / `setTimeout` / 超时配置 / 重试次数 / 分页 size
- 出现在样式断点（应走 Tailwind config）

**已有常量目录检测**：

```bash
ls app/constants/ 2>/dev/null || ls constants/ 2>/dev/null
```

存在则建议把字面量挪进去。

### 4.2 字符串字面量 🟡 major

- 重复出现的 URL / API 路径片段（应抽常量或走 service 层）
- 重复出现的提示文案（应走 i18n）
- 枚举值（应抽 enum 或 const as const）

### 4.3 错误码 / 状态码 🟡 major

`200` / `400` / `401` / `500` 等 HTTP 状态裸用 → 建议抽 `HTTP_STATUS` 枚举。

---

## 五、定时配置（cron / setInterval / 轮询）

### 5.1 硬编码间隔时间 🟡 major

```bash
grep -nE 'set(Interval|Timeout)\s*\(' <changed_files>
```

每处检查：

- 第二个参数是否字面量（应抽 `constants/timing.ts` 之类）
- 数值是否合理（< 1000ms 频率过高需说明理由）

### 5.2 清理逻辑缺失 🔴 critical

参见 3.2 生命周期清理，重复但单独标记，因为这是 LLM 最常漏的点。

### 5.3 页面可见性处理 🔵 minor

长期运行的轮询（如 dashboard 实时刷新）：

- 是否监听 `visibilitychange` 在后台暂停
- 是否用 `useDocumentVisibility` / `useIntervalFn` 等 VueUse 工具

未处理 → minor 建议。

### 5.4 错误退避 🟡 major

轮询请求失败时：

- 是否有重试上限
- 是否有指数退避或熔断
- 连续失败是否会无限刷请求

### 5.5 重复轮询同一资源 🟡 major

**检测策略**（grep 不够准，需结合语义判断）：

1. 用 `Grep` 找出**含 timer 的文件清单**：
   ```
   pattern: 'set(Interval|Timeout)\\s*\\(', output_mode: 'files_with_matches'
   ```
2. 对这些文件用 `Read` 获取上下文，提取其轮询调用的 **API endpoint / store action / composable 名**
3. 若同一 endpoint 被多个文件轮询 → 报告"重复轮询"

**判断**：同一 URL/资源被 2+ 处独立轮询 → 建议抽到统一 Store/Composable 订阅，下游 watch 即可。

---

## 六、项目配置合理性

> **触发条件（放宽）**：diff 涉及任意"配置类"文件即触发，包括但不限于：
>
> - **依赖与构建**：`package.json`、`package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`*.config.{ts,js,mjs,cjs}`（含 `nuxt.config.*` / `vite.config.*` / `tailwind.config.*` / `tsup.config.*` 等）
> - **TypeScript**：`tsconfig*.json`、`jsconfig*.json`
> - **Lint / 格式**：`eslint.config.*` / `.eslintrc*` / `stylelint.config.*` / `.prettierrc*` / `biome.json`
> - **隐藏 rc 配置**：`.npmrc` / `.nvmrc` / `.node-version` / `.editorconfig` 等 `.*rc*`
> - **Git / Husky**：`.gitignore` / `.gitattributes` / `.husky/`
> - **CI / 部署**：`.github/workflows/*.yml` / `.gitlab-ci.yml` / `Dockerfile` / `docker-compose.*`
> - **项目类型自有配置**：如 skill 插件的 `plugin.json` / `marketplace.json`，VS Code 扩展的 `extension.json`，Chrome 扩展的 `manifest.json`
>
> **匹配策略**：先用上述清单 glob 匹配；未命中但文件名形如 `*.json` / `*.{yaml,yml}` / `*.toml` 且位于仓库根或 `.config/` / `config/` 下 → 也纳入审计，由 LLM 根据文件实际作用判断是否真审（lock 文件、IDE 个人配置如 `.vscode/settings.json` 等可跳过）。
> 完全未匹配 → 本项标 ✅。

### 6.1 package.json 🟡 major

- `dependencies` 与 `devDependencies` 分类是否合理（如 `@types/*` 误放 dependencies）
- 版本号锁定方式（混用 `^` / `~` / 固定版本）
- `engines` 字段是否声明 Node 版本
- 重复依赖（同一库不同版本同时存在）

### 6.2 nuxt.config.ts 🟡 major

- `runtimeConfig` 与 `publicRuntimeConfig` 是否混淆（敏感配置误放 public）
- `ssr` / `nitro` 配置与项目实际场景是否匹配
- 模块顺序（`@nuxtjs/i18n` / `@pinia/nuxt` 等推荐位置）

### 6.3 tsconfig 🟡 major

- `strict: true` 是否开启
- `noUnusedLocals` / `noImplicitReturns` 等推荐项
- path alias 与 `nuxt.config` 是否一致

### 6.4 ESLint / Prettier / Stylelint ⚪ architectural

- 规则集是否覆盖 TS + Vue + 项目实际栈
- 是否有规则冲突（如 Prettier 与 ESLint stylistic）
- `.husky/` pre-commit 是否启用

### 6.5 .gitignore 🔵 minor

- 是否忽略了 `.env*`、`dist/`、`.nuxt/`、`node_modules/`
- 是否误忽略了应入库的配置模板

### 6.6 项目类型自有配置 🟡 major

对非 Nuxt/Vue 的项目特定配置（`plugin.json` / `marketplace.json` / `manifest.json` / `extension.json` 等）：

- **必填字段完整性**：`name` / `version` / `description` 等基础元信息齐全
- **版本号一致性**：插件/扩展类项目，`plugin.json` 的 `version` 与 `package.json` / `marketplace.json` 是否同步
- **路径有效性**：配置中引用的文件路径（`main` / `entry` / `icon` 等）是否真实存在
- **冗余字段**：废弃字段、与新版规范不符的字段
- **许可证 / 作者**：`license` / `author` 是否声明

> 该子项让 LLM 根据具体文件类型自适应审查，不要求穷举所有项目类型。

---

## 报告输出对应关系

每项审计完成后，按以下结构写入报告对应章节：

```markdown
## N. <维度名>

### 检查结果
- 🔴 critical: N 项
- 🟡 major: N 项
- 🔵 minor: N 项
- ⚪ architectural: N 项（仅建议）

### 问题清单

#### 🔴 critical
- `path/to/file.vue:42` — 问题描述。建议：...

#### 🟡 major
- ...

（无问题时写"✅ 本维度未发现问题"）
```

# AI 代码体检 / LLM 反模式知识库

> 用于 `/fe-dev:arch-audit` 的反模式检测规则。
>
> **定位**：专门检测 LLM 写代码的"指纹"——人类很少这么写、LLM 频繁这么写的模式。**不查通用代码质量**（那是 code-review / ast-lint 的事）。
> **置信度门槛**：≥ 80% 才报告，不猜测。
> **严重度**：🔴 critical / 🟡 major / 🔵 minor / ⚪ architectural

## 反模式编号规则

| 前缀 | 含义 |
|---|---|
| `M-NNN` | known 状态的已知反模式（modes） |
| `P-NNN` | 待观察池里的候选（pending），在 `arch-audit-pending-patterns.md` 中管理 |
| `R-NNN` | 已退役模式（retired），保留在本文末尾仅供追溯 |

## 三态管理

| 状态 | 进入检测 | 进入修复列表 | 报告中表现 |
|---|---|---|---|
| **known** | ✅ | ✅ | 命中即报问题 |
| **pending** | 提示性匹配 | ❌ | 仅累计命中次数，不报问题 |
| **retired** | ❌ | ❌ | 完全跳过 |

---

## 一、命名 & 字段一致性

> LLM 跨文件独立生成时最易出问题：同一概念命名漂移、复制粘贴未完整改名。单文件 review 看不出来，跨文件视角刚好能查。

### [M-001] 同一概念跨文件命名漂移 🟡 major · known

**模式**：相同业务概念在不同文件用不同标识符。

- A.ts: `userId: string`
- B.ts: `user_id: string`
- C.ts: `uid: string`

**检测**：

1. 提取 `<changed_files>` 中所有变量名 / 字段名 / 函数参数名（重点 interface / type / Props / 函数签名）
2. 找出语义相近但拼写不同的组合（驼峰 / 下划线 / 缩写互转）
3. 同一仓库内出现 2+ 种写法 → 报告

**建议**：统一为项目主流命名（看 majority 写法）。

**首次记录**：2026-05-14

### [M-002] 复制粘贴模板未完整改名 🔴 critical · known

**模式**：复制了一段相似代码改了部分变量，但留了原模板的字段/字符串。

例：复制"用户列表"做"订单列表"，新文件却仍有 `userName`、`user.role`、提示文案"用户已删除"。

**检测**：

1. 在新增/修改的文件里，看是否出现"上下文 = X 但用了 Y 概念的字段名"
2. 重点查文案、注释、变量名与文件名/组件名的语义匹配

**建议**：完整替换，不留遗漏。

**首次记录**：2026-05-14

### [M-003] 路由 / API 路径与对应资源名不一致 🟡 major · known

**模式**：路由是 `/orders`，但页面组件叫 `UserList.vue`、service 文件叫 `userService.ts`。复制粘贴遗症。

**检测**：对每个变更的 page / service / store，检查路径段、文件名、内部主对象名三者是否一致。

**首次记录**：2026-05-14

---

## 二、错误处理与边界覆盖

> LLM 极度偏向 happy path。"如果一切顺利"那一支总是写得很好；空、错、超时这些分支经常缺。

### [M-101] async 函数未 catch 🔴 critical · known

**模式**：

```ts
async function load() {
  const data = await api.fetch()
  state.list = data        // ← 没有 try/catch，请求失败时 state.list 不更新且无任何提示
}
```

**检测**：

```
grep -nE 'async\s+function|async\s*\(' <changed_files>
```

对每处 hit，检查：

- 是否有外层 try/catch
- 调用方是否有 .catch
- 返回的 Promise 是否在调用链最末端被消费

均无 → critical。

**首次记录**：2026-05-14

### [M-102] Promise 链断尾 🟡 major · known

**模式**：`.then(...)` 后没 `.catch(...)`，且未 await。

**首次记录**：2026-05-14

### [M-103] 空数组 / null / undefined 边界未处理 🟡 major · known

**模式**：

```ts
const first = list[0].name       // ← list 可能为空
const name = user?.profile.name  // ← profile 可能为 null
```

**检测**：

1. grep `\[0\]\.|\[length - 1\]\.` → 直接索引未守卫
2. grep `\?\.\w+\.\w+` → 链式访问中间值未守卫
3. 函数参数 / 返回值与类型签名对照，可空类型未处理

**首次记录**：2026-05-14

### [M-104] 用户输入未校验 🟡 major · known

**模式**：表单提交、URL query 参数、外部 API 响应直接当可信数据用。

**检测**：在 service / store / page 中接收外部数据后是否有 schema 校验 / typeof / 范围检查。

**首次记录**：2026-05-14

---

## 三、依赖完整性（响应式依赖项漏写）

> LLM 复制别人的 hook / watch / computed 时，经常忘记同步改 deps，或者新增的依赖没加进 deps 数组。

### [M-201] Vue watch source 漏依赖 🔴 critical · known

**模式**：

```ts
watch(() => formData.subtype, (v) => {
  loadOptions(formData.category, formData.subtype) // ← category 未在 source 中
})
```

**检测**：对每个 `watch(...)`：

1. 提取 source（第一参 getter）引用的响应式属性
2. 提取 callback 中使用的响应式属性
3. callback 用到但 source 没声明的属性 → 漏依赖

**首次记录**：2026-05-14

### [M-202] computed 内引用响应式属性漏算 🟡 major · known

**模式**：computed 内引用 `state.X` 但 X 是普通对象（非 ref/reactive），无法触发更新。

**首次记录**：2026-05-14

### [M-203] React useEffect / useMemo / useCallback deps 数组漏依赖 🔴 critical · known

**模式**：函数体内引用了外部变量但 deps 数组没列出。常见于 LLM 从别处复制的 hook。

**检测**：对每个 useEffect/useMemo/useCallback，比对函数体引用 vs deps 列表。

**首次记录**：2026-05-14

### [M-204] Pinia getter 内依赖漏算 🟡 major · known

**模式**：getter 内依赖 store 外部状态（其他 store / global），未通过 store action 注入。

**首次记录**：2026-05-14

---

## 四、常量与工具复用

> LLM 不主动查项目已有 `constants/` `utils/` `composables/`，每个文件各写各的；导致同一字面量、同一工具函数在多处重复。

### [M-301] 已有常量目录但仍硬编码 🟡 major · known

**模式**：项目根有 `app/constants/`（或 `constants/`），但变更中仍出现:

- 硬编码超时时间、轮询间隔、分页大小
- 硬编码状态码、错误码字面量
- 重复的字符串 enum

**检测**：

```bash
ls app/constants/ constants/ 2>/dev/null  # 看是否有常量目录
```

存在 → 在变更里找应抽常量的字面量。

**首次记录**：2026-05-14

### [M-302] 同一字面量在 2+ 文件重复 🟡 major · known

**模式**：同一个有业务含义的字面量（不是 0/1）在多处独立出现。

**检测**：

```bash
# 提取所有字符串/数字字面量，跨文件去重计数
```

同字面量在 2+ 文件 → major。

**首次记录**：2026-05-14

### [M-303] 工具函数复造 🟡 major · known

**模式**：变更中实现了一个工具函数（如 formatDate、deepClone、debounce），但项目 `utils/` 或 VueUse / lodash 已有同名/同功能函数。

**检测**：扫 `utils/` 已有导出 + 项目依赖（package.json）。

**首次记录**：2026-05-14

### [M-304] composable 复造 🟡 major · known

**模式**：新写了一个 composable（`useX`），但项目已有同名/同语义的。

**首次记录**：2026-05-14

---

## 五、定时与异步生命周期

> LLM 用 setInterval / setTimeout / 订阅 / 长轮询时，最常漏的是清理；写竞态保护和退避的更少。

### [M-401] setInterval / setTimeout 未清理 🔴 critical · known

**模式**：组件内调用 `setInterval` 但 `onBeforeUnmount` / `onUnmounted` 未 `clearInterval`。

**检测**：

```bash
grep -nE 'setInterval|setTimeout' <changed_files>
```

对每处 hit，检查同文件是否有对应 `clear*` 调用。Composable 也要查（应暴露清理函数或自己处理）。

**首次记录**：2026-05-14

### [M-402] addEventListener / 订阅未移除 🔴 critical · known

**模式**：`window.addEventListener` / `EventBus.on` / Pinia subscribe / WebSocket 监听未在生命周期对端清理。

**首次记录**：2026-05-14

### [M-403] 轮询无错误退避 / 无失败上限 🟡 major · known

**模式**：

```ts
setInterval(async () => {
  const data = await api.fetch()  // ← 失败时无处理，下次还会继续轮询，可能雪崩
  state.list = data
}, 3000)
```

**检测**：轮询体内是否有 try/catch + 失败计数 + 失败累计后停止 / 退避。

**首次记录**：2026-05-14

### [M-404] 多个组件重复轮询同一资源 🟡 major · known

**模式**：A 组件每 5s 轮询 `/api/orders`，B 组件也每 5s 轮询同 URL。应抽到统一 Store / Composable。

**检测**：

1. 找所有含 timer 的文件
2. 提取每个 timer 内调用的 endpoint
3. 同 endpoint 出现在 2+ 处 → major

**首次记录**：2026-05-14

### [M-405] 异步请求未取消（竞态）🟡 major · known

**模式**：watch 触发请求，新值来时旧请求仍在路上，旧响应回来时覆盖了新数据。

**检测**：watch + 异步请求场景，是否有 `AbortController` / 请求 ID 比对 / `signal` 传入。

**首次记录**：2026-05-14

---

## 六、守卫漏写（CLAUDE.md / i18n / 类型）

> 项目级硬规则、国际化、类型守卫——LLM 不主动遵守，因为它在生成时没有"这个项目要求 X"的强约束。

### [M-501] CLAUDE.md 硬规则违反 🔴 critical · known

**前置**：变更文件向上能找到 CLAUDE.md。

**检测**：读取该 CLAUDE.md，提取"禁止 / 不允许 / must not / forbidden / 不要 / 不得"语句，逐条比对变更代码。

**首次记录**：2026-05-14

### [M-502] CLAUDE.md 推荐规范偏离 🟡 major · known

**检测**：CLAUDE.md "推荐 / 优先 / should / 约定" 的对应规范未遵守。

**首次记录**：2026-05-14

### [M-503] 硬编码用户可见文案（i18n 漏迁移）🟡 major · known

**前置**：项目使用 vue-i18n / react-intl 等 i18n 框架（检测 package.json / locales 目录）。

**模式**：模板里 / ElMessage / alert / console 中出现中文/英文用户可见文案，未走 `t()` / `$t()`。

**首次记录**：2026-05-14

### [M-504] 类型 any 逃逸 🟡 major · known

**模式**：`as any` / `Record<string, any>` / `: any` / `<any>` 显式逃逸类型系统。

**检测**：

```bash
grep -nE 'as\s+any|:\s*any\b|<any>|Record<\s*string\s*,\s*any\s*>' <changed_files>
```

排除测试 mock / 故意逃逸（带 `// @ts-expect-error` 或 `// eslint-disable` 解释）。

**首次记录**：2026-05-14

### [M-505] 跨边界数据未类型守卫 🟡 major · known

**模式**：从 API / localStorage / URL 读取数据后直接当强类型使用，未做 typeof / Zod / 校验。

**首次记录**：2026-05-14

---

## 报告输出对应关系

每维度审计完成后，按以下结构写入报告：

```markdown
## N. <维度名>

### 检查结果
- 🔴 critical: N 项 · 🟡 major: N 项 · 🔵 minor: N 项 · ⚪ architectural: N 项

### 命中模式

#### 🔴 critical
- **[M-XXX]** `path/to/file.vue:42` — <问题摘要>
  - 建议：<...>

#### 🟡 major
- ...

（无命中 → "✅ 本维度未发现已知反模式"）
```

---

## 已退役模式（retired）

> 这里保留已退役模式的编号和退役原因，方便追溯。**不参与检测**。

（暂无）

---

## 维护说明

- **新模式入池**：`arch-audit` 检测时发现新模式 → 由用户确认后写入 `arch-audit-pending-patterns.md`（编号 P-NNN）
- **转正**：月度评审，命中次数 ≥ 3 且误报率低的 pending 模式，迁移到本文件并改编号为 M-NNN
- **退役**：known 模式若长期误报率高、被用户多次撤销，迁移到本文件末尾"已退役模式"段落，编号改为 R-NNN

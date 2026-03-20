---
name: code-review
description: 代码审查，审查工作区变更代码。触发词: "code review", "代码审查", "审查代码", "review"
allowed-tools: Read, Grep, Glob, Bash(git *), mcp__ast-lint__analyze_git_diff, mcp__ast-lint__analyze_file, mcp__ast-lint__analyze_code
---

# Code Review - 代码审查

> 审查规则: `<skill-path>/references/code-review-rules.md`

两阶段审查：先用 ast-lint 做确定性静态分析（如已安装），再用语义审查补充逻辑/设计问题。

## 参数

- `<scope>`: 可选，审查范围
  - 不传（默认）— 审查所有未提交的变更（staged + unstaged）
  - `--staged` — 仅审查已暂存的变更
  - `<file path>` — 仅审查指定文件

## 使用方式

```
/fe-dev:code-review
/fe-dev:code-review --staged
/fe-dev:code-review src/components/Login.vue
```

## 执行流程

### 1. 获取变更文件列表

根据 scope 参数：

- 默认：

```bash
git diff --name-only
git diff --cached --name-only
```

- `--staged`：

```bash
git diff --cached --name-only
```

- 指定文件：直接使用该文件路径

无变更文件 → 提示「没有需要审查的变更」，退出。

### 2. 检测 ast-lint MCP 是否可用

尝试调用 `mcp__ast-lint__analyze_code` 做一次探测：

```
参数:
  code: "const x = 1;"
  filePath: "test.ts"
```

- **调用成功** → ast-lint 可用，进入第一阶段静态分析
- **调用失败 / 工具不存在** → ast-lint 未安装，跳过第一阶段，输出提示：

```
💡 提示: 未检测到 ast-lint MCP，跳过静态分析阶段。
   安装后可获得 37 条 AST 规则的确定性检查，详见: https://www.npmjs.com/package/ast-lint-mcp
```

### 3. 第一阶段：ast-lint 静态分析（ast-lint 可用时执行）

根据 scope 调用对应的 MCP 工具：

- **默认 / --staged**：调用 `mcp__ast-lint__analyze_git_diff`

```
参数:
  base: "HEAD"          # 对比基准
  onlyChanged: true     # 只分析变更行
  format: "detailed"    # 详细输出
```

- **指定文件**：调用 `mcp__ast-lint__analyze_file`

```
参数:
  filePath: "<绝对路径>"
```

收集 ast-lint 报告的所有问题，按严重级别分类（error / warning / info）。

### 4. 第二阶段：语义审查（始终执行）

读取 `<skill-path>/references/code-review-rules.md`，获取变更的 diff 和完整文件内容。

按规则清单审查。**如果第一阶段已执行，跳过 ast-lint 已覆盖的检查项**：

**ast-lint 已覆盖（有 ast-lint 时跳过）：**
- 硬编码密钥、innerHTML/XSS、unsafe eval、unsafe regex
- 魔法数字、长函数、深嵌套、圈复杂度、参数过多
- v-for index key、v-if + v-for、computed 异步、定时器清理
- DOM 直接操作、事件监听泄漏、懒加载、大包导入
- 命名规范、废弃 API、i18n 特殊字符

**无 ast-lint 时**：按 `code-review-rules.md` 全部规则审查，不跳过任何项。

**Claude 语义审查聚焦（code-review-rules.md 中 ast-lint 未覆盖的部分）：**
- TypeScript 类型安全（any 逃逸、空值检查、类型收窄、泛型约束）
- Vue 响应式陷阱（ref/reactive 选择、watch getter、computed 副作用）
- 组件设计（Props/Emits 类型声明、Provide/Inject、组件体积）
- Element Plus 深层用法（表单验证模式、Dialog 状态重置、表格性能）
- 国际化完整性（硬编码文案、Key 一致性）
- 样式规范（Tailwind 优先级、scoped 与 :deep() 使用）
- 常见 Bug 模式（异步竞态、内存泄漏、浅拷贝陷阱）
- **Nuxt 专属**（auto-imports 冗余导入、SSR/Hydration、useFetch/useAsyncData、runtimeConfig、middleware、server/ 目录）

**只报告有把握的问题（置信度 >= 80%），不要猜测。**

### 5. 合并输出审核报告

#### 有 ast-lint 时：两阶段合并报告

```markdown
## 代码审核报告

### 总结

- 审查文件数: N
- 严重: N 个（ast-lint: N, 语义审查: N）
- 重要: N 个（ast-lint: N, 语义审查: N）
- 建议: N 个（ast-lint: N, 语义审查: N）

---

### 第一阶段：静态分析（ast-lint）

#### src/components/Login.vue
- [error] L42 `security/no-inner-html`: innerHTML 赋值，存在 XSS 风险
- [warning] L78 `maintainability/magic-number`: 魔法数字 3000

#### src/utils/format.ts
- ✅ 无问题

---

### 第二阶段：语义审查

#### src/components/Login.vue
- [严重] L35: `formData` 使用 `as any` 绕过类型检查，应定义接口
- [重要] L60: watch 监听 `formData.type` 缺少 getter 函数，只会触发一次

#### src/pages/index.vue
- [重要] L12: `useFetch` 缺少 key 参数，可能导致 SSR 缓存冲突

---

### 亮点
- 做得好的地方

### 审核结果
✅ 审核通过 | ⚠️ 有告警 (N 条) | ❌ 未通过 (N 严重, N 重要)
```

#### 无 ast-lint 时：仅语义审查报告

```markdown
## 代码审核报告

> 💡 未检测到 ast-lint MCP，仅执行语义审查。安装后可增强静态分析能力。

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

### 6. 审核结果判定

**严重级别映射：**
- ast-lint `error` + 语义审查「严重」 → **严重**（阻断提交）
- ast-lint `warning` + 语义审查「重要」 → **重要**（告警）
- ast-lint `info` + 语义审查「建议」 → **建议**（不阻断）

**最终结果：**
- 有**严重**问题 → `❌ 未通过`
- 仅**重要**问题 → `⚠️ 有告警`
- 仅**建议**或无问题 → `✅ 审核通过`

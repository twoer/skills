# AI 代码体检报告

> 由 `/fe-dev:arch-audit` 生成。本报告专注 LLM 反模式检测，与通用代码 review 互补。

## 元信息

| 项目 | 值 |
|------|-----|
| 报告日期 | {{DATE}} |
| 体检范围 | {{SCOPE}} |
| Git HEAD | {{COMMIT_HASH}} |
| 分支 | {{BRANCH}} |
| 变更文件数 | {{CHANGED_FILE_COUNT}} |
| 找到的 CLAUDE.md | {{CLAUDE_MD_COUNT}} 个 |

## 变更文件清单

```
{{CHANGED_FILES}}
```

---

## 总览

> 仅统计 **known** 状态反模式命中。pending 命中见末尾"待观察候选"段落。

| 维度 | 🔴 critical | 🟡 major | 🔵 minor | ⚪ architectural |
|------|------------|----------|----------|-----------------|
| 1. 命名 & 字段一致性 | 0 | 0 | 0 | 0 |
| 2. 错误处理与边界覆盖 | 0 | 0 | 0 | 0 |
| 3. 依赖完整性 | 0 | 0 | 0 | 0 |
| 4. 常量与工具复用 | 0 | 0 | 0 | 0 |
| 5. 定时与异步生命周期 | 0 | 0 | 0 | 0 |
| 6. 守卫漏写 | 0 | 0 | 0 | 0 |
| **合计** | **0** | **0** | **0** | **0** |

**结论**：
- ✅ 通过（无 critical / major）
- ⚠️ 需关注（有 major，无 critical）
- ❌ 需立即处理（有 critical）

---

## 1. 命名 & 字段一致性

### 检查结果
- 🔴 critical: 0 · 🟡 major: 0 · 🔵 minor: 0 · ⚪ architectural: 0

### 命中模式

✅ 本维度未发现已知反模式

---

## 2. 错误处理与边界覆盖

### 检查结果
- 🔴 critical: 0 · 🟡 major: 0 · 🔵 minor: 0 · ⚪ architectural: 0

### 命中模式

✅ 本维度未发现已知反模式

---

## 3. 依赖完整性

### 检查结果
- 🔴 critical: 0 · 🟡 major: 0 · 🔵 minor: 0 · ⚪ architectural: 0

### 命中模式

✅ 本维度未发现已知反模式

---

## 4. 常量与工具复用

### 检查结果
- 🔴 critical: 0 · 🟡 major: 0 · 🔵 minor: 0 · ⚪ architectural: 0

### 命中模式

✅ 本维度未发现已知反模式

---

## 5. 定时与异步生命周期

### 检查结果
- 🔴 critical: 0 · 🟡 major: 0 · 🔵 minor: 0 · ⚪ architectural: 0

### 命中模式

✅ 本维度未发现已知反模式

---

## 6. 守卫漏写（CLAUDE.md / i18n / 类型）

### 检查结果
- 🔴 critical: 0 · 🟡 major: 0 · 🔵 minor: 0 · ⚪ architectural: 0

### 命中模式

✅ 本维度未发现已知反模式

---

## 待观察候选（疑似新反模式）⭐

> 本次审计中发现的、checklist 未覆盖但**看起来像 LLM 反模式**的代码片段。
> 用户确认后会写入 `arch-audit-pending-patterns.md` 待观察池。
> **不进入修复列表**，仅作为知识库增长的来源。

（本次未发现新模式 / 列出 N 条候选）

---

## 下一步

- **critical + major** — 体检流程会询问是否立即逐项修复
- **minor / architectural** — 不进自动修复，按团队节奏处理
- **待观察候选** — 体检流程会询问是否写入 pending 池
- **月度评审 pending 池** — 命中数 ≥ 3 且误报低的模式可晋升 known

> 报告位于 `docs/audits/`，建议加入 `.gitignore`（个人体检记录，不入库）。

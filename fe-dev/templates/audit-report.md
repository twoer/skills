# 架构审计报告

## 元信息

| 项目 | 值 |
|------|-----|
| 报告日期 | {{DATE}} |
| 审计范围 | {{SCOPE}}（MVP 默认 diff） |
| Git HEAD | {{COMMIT_HASH}} |
| 分支 | {{BRANCH}} |
| 变更文件数 | {{CHANGED_FILE_COUNT}} |
| 项目 CLAUDE.md | {{CLAUDE_MD_STATUS}} |

## 变更文件清单

<!-- 列出本次审计涉及的所有变更文件 -->

```
{{CHANGED_FILES}}
```

---

## 总览

| 维度 | 🔴 critical | 🟡 major | 🔵 minor | ⚪ architectural |
|------|------------|----------|----------|-----------------|
| 1. 技术架构 / 技术栈 | 0 | 0 | 0 | 0 |
| 2. CLAUDE.md 规则符合度 | 0 | 0 | 0 | 0 |
| 3. Vue 最佳实践 | 0 | 0 | 0 | 0 |
| 4. 公共常量提取 | 0 | 0 | 0 | 0 |
| 5. 定时配置 | 0 | 0 | 0 | 0 |
| 6. 项目配置 | 0 | 0 | 0 | 0 |
| **合计** | **0** | **0** | **0** | **0** |

**结论**：
- ✅ 通过（无 critical / major）
- ⚠️ 需关注（有 major，无 critical）
- ❌ 需立即处理（有 critical）

---

## 1. 技术架构 / 技术栈主流性

<!-- 由 SKILL 按 checklist 一节自动填充 -->

### 检查结果
- 🔴 critical: 0 项
- 🟡 major: 0 项
- 🔵 minor: 0 项
- ⚪ architectural: 0 项

### 问题清单

✅ 本维度未发现问题

---

## 2. CLAUDE.md 规则符合度

### 检查结果
- 🔴 critical: 0 项
- 🟡 major: 0 项
- 🔵 minor: 0 项
- ⚪ architectural: 0 项

### 问题清单

✅ 本维度未发现问题

---

## 3. Vue 最佳实践（含 style）

### 检查结果
- 🔴 critical: 0 项
- 🟡 major: 0 项
- 🔵 minor: 0 项
- ⚪ architectural: 0 项

### 问题清单

✅ 本维度未发现问题

---

## 4. 公共常量提取

### 检查结果
- 🔴 critical: 0 项
- 🟡 major: 0 项
- 🔵 minor: 0 项
- ⚪ architectural: 0 项

### 问题清单

✅ 本维度未发现问题

---

## 5. 定时配置（cron / setInterval / 轮询）

### 检查结果
- 🔴 critical: 0 项
- 🟡 major: 0 项
- 🔵 minor: 0 项
- ⚪ architectural: 0 项

### 问题清单

✅ 本维度未发现问题

---

## 6. 项目配置合理性

### 检查结果
- 🔴 critical: 0 项
- 🟡 major: 0 项
- 🔵 minor: 0 项
- ⚪ architectural: 0 项

### 问题清单

✅ 本维度未发现问题

---

## 下一步

- **critical + major** — `/fe-dev:arch-audit` 在生成本报告后会询问是否立即逐项修复（带 ask 确认 + 反向 Edit 撤销）
- **minor** — 不进自动修复流程，按团队节奏手动处理
- **architectural** — 架构决策项，**绝不自动改**，请人工评估

> 报告位于 `docs/audits/`，默认建议加入 `.gitignore`（个人体检记录，无需入库）。如团队需要追踪审计历史可自行决定。

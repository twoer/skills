---
name: arch-audit
description: AI 代码体检，专门检测 LLM 写代码的常见反模式（命名漂移 / 错误处理偏置 / 依赖漏写 / 复用缺失 / 异步生命周期 / 守卫漏写）。触发词 "arch audit", "ai 代码体检", "llm 反模式", "arch-audit", "代码体检"
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(ls *), Bash(cat *), Bash(date *), Bash(mkdir *), Bash(find *), Write, Edit, Agent, AskUserQuestion
---

# Arch Audit - AI 代码体检 / LLM 反模式审计

> 反模式知识库: `<skill-path>/references/arch-audit-checklist.md`
> 待观察模式池: `<skill-path>/references/arch-audit-pending-patterns.md`
> 报告模板: `<plugin-root>/templates/audit-report.md`

针对"LLM 批量产出代码后不放心"的场景，**专门检测 LLM 写代码的可识别反模式**——不是通用代码质量审查。

**定位**：

- **找 LLM 特有的"指纹"**：跨文件命名漂移、复制粘贴漏改、依赖项漏写、各写各的（不查已有常量/工具）、happy path 偏置、复制 hook 漏改 deps、i18n / 类型守卫漏写……
- **跨文件视角**：单文件 review 看不出的问题，arch-audit 视角能查
- **持续演化的知识库**：每发现新反模式 → 写入「待观察池」→ 月度评审转正进 checklist

与 `/fe-dev:code-review` 的边界：

| | code-review | arch-audit |
|---|---|---|
| 视角 | 单文件 diff，行级 | 跨文件，模式级 |
| 关注 | 通用代码质量、bug、安全 | LLM 反模式（人类很少这么写）|
| 输出 | 控制台行级报告 | `docs/audits/audit-{date}.md` 落档 |
| 时机 | commit 前 | LLM 批量产出后 / 周期性体检 |
| 重叠 | 各种规则细节（响应式陷阱、watch 写法） | **不查通用规则**，专注 LLM 模式 |

> 通用 Vue 最佳实践、项目配置合理性等**不在 arch-audit 范围**，请用 `/fe-dev:code-review` 或 ast-lint-mcp。

## 参数

- `<scope>`: 可选，审计范围
  - 不传（默认）— `--scope=diff`，审计工作区变更 + 未追踪 + 最近 3 个 commit
  - `--scope=diff` — 同上
  - `--scope=feat` — **暂未实现**
  - `--scope=all` — **暂未实现**

## 使用方式

```
/fe-dev:arch-audit
/fe-dev:arch-audit --scope=diff
```

## 6 个维度（LLM 反模式专项）

| # | 维度 | LLM 为什么常出问题 |
|---|------|---|
| 1 | **命名 & 字段一致性** | 跨文件独立生成，同概念命名漂移（userId / user_id / uid）；复制粘贴模板未完整改名 |
| 2 | **错误处理与边界覆盖** | LLM 倾向 happy path，async 不 catch、空数组/null/边界条件省略 |
| 3 | **依赖完整性** | useEffect / watch / computed / Pinia getter 的依赖项漏写；复制别人的 hook 没改 deps |
| 4 | **常量与工具复用** | LLM 不主动查已有 `constants/` `utils/`，各写各的，跨文件重复 |
| 5 | **定时与异步生命周期** | setInterval/setTimeout/订阅没清理；轮询无退避；竞态不取消 |
| 6 | **守卫漏写**（CLAUDE.md / i18n / 类型） | 项目级硬规则漏遵守、硬编码文案、类型 any 逃逸 |

完整反模式 ID 化清单见 `<skill-path>/references/arch-audit-checklist.md`。

## 知识库三态

每个反模式在 checklist 中有状态：

| 状态 | 含义 | 进入修复列表 |
|---|---|---|
| **已知**（known）| 经过验证、误报率低 | ✅ 进入 |
| **待观察**（pending） | 命中次数不足 / 误报率未知 | ❌ 仅报告标注，不进修复 |
| **已退役**（retired） | 误报率高、争议大 | ❌ 完全不查 |

退役不删除，保留可追溯。

## 执行流程

### 1. 解析参数与环境

```bash
git rev-parse --is-inside-work-tree
```

非 git 仓库 → 报错退出。

`--scope=feat` / `--scope=all` → 输出"暂未实现，按 diff 模式继续"。

### 2. 收集变更范围

4 个来源合并去重得 `<changed_files>`，**末尾过滤掉 `docs/audits/**`**：

```bash
{
  git diff --name-only
  git diff --cached --name-only
  git ls-files --others --exclude-standard
  COMMIT_COUNT=$(git rev-list --count HEAD)
  if [ "$COMMIT_COUNT" -gt 3 ]; then
    git diff --name-only HEAD~3 HEAD
  elif [ "$COMMIT_COUNT" -gt 1 ]; then
    git diff --name-only HEAD~$((COMMIT_COUNT - 1)) HEAD
  else
    git diff-tree --no-commit-id --name-only -r HEAD
  fi
} | sort -u | grep -v '^docs/audits/'
```

无变更 → 「最近无变更，无需体检」退出。

### 3. 准备报告

```bash
mkdir -p docs/audits
DATE=$(date +%Y-%m-%d-%H%M)
REPORT=docs/audits/audit-${DATE}.md
```

**.gitignore 首次提示**：若未包含 `docs/audits/`，输出一次性建议（不强制）。

**填充模板**：用 `Read` 读 `<plugin-root>/templates/audit-report.md`，替换占位符后用 `Write` 整体输出到 `$REPORT`：

| 占位符 | 替换为 |
|---|---|
| `{{DATE}}` | `date "+%Y-%m-%d %H:%M"` |
| `{{SCOPE}}` | `diff` |
| `{{COMMIT_HASH}}` | `git rev-parse --short HEAD` |
| `{{BRANCH}}` | `git branch --show-current` |
| `{{CHANGED_FILE_COUNT}}` | 列表条数 |
| `{{CHANGED_FILES}}` | 列表，每行一个 |
| `{{CLAUDE_MD_COUNT}}` | 找到的 CLAUDE.md 数量（步骤 4）|

### 4. 找出所有适用 CLAUDE.md（多层）

```bash
find . -name 'CLAUDE.md' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*'
```

**作用域映射**：对每个 `<changed_files>` 文件，向上查找最近的 CLAUDE.md，作为维度 6 "守卫漏写"中 CLAUDE.md 子项的对比基线。无适用 CLAUDE.md → 该子项跳过。

### 5. 逐维度审计（主线程串行）

读取 `<skill-path>/references/arch-audit-checklist.md`，对每个维度的**"已知"状态条目**执行检测：

- **证据收集**：按需 grep / 读文件；某维度涉及 > 10 文件时派 `Explore` 子代理
- **置信度门槛**：≥ 80% 才报告
- **状态过滤**：仅检测 **known** 状态条目；**pending** 仅做"提示性匹配"（命中也不报问题，只累计命中次数）；**retired** 完全跳过

**严重度分级**：

- 🔴 critical：会引起 bug / 安全 / 数据损坏
- 🟡 major：可维护性 / 一致性问题，需修
- 🔵 minor：建议性
- ⚪ architectural：架构选型类，**绝不自动改**

**写入策略**：每维度完成后用 `Edit` 把模板章节中"✅ 本维度未发现问题"替换为实际内容，同时更新顶部「总览」表格对应行计数。

### 5b. 捕获新反模式（工具自演化机制）⭐

逐维度审计的**同时**，主线程留意 `<changed_files>` 中**未被已有 checklist 条目命中**但**看起来像 LLM 反模式**的代码片段。例如：

- 看到一个新的"复制粘贴指纹"（变量名一致但类型/上下文不符）
- 看到一种 checklist 未列的依赖漏写形态
- 看到一种新的硬编码模式（特定字段、特定格式）

这些"疑似新模式"汇总到报告末尾的「**待观察模式候选**」段落，每条记录：

```
- 文件: <path:line>
- 现象: <一句话描述>
- 建议归类: <维度 #>
- 建议严重度: <critical/major/minor>
```

报告写完后，主线程**询问用户**是否把候选写入 `arch-audit-pending-patterns.md`（详见步骤 7b）。

### 6. 输出摘要

报告写完后控制台输出：

```
✅ AI 代码体检完成

报告：docs/audits/audit-2026-05-14-1530.md

汇总（已知反模式命中）：
  🔴 critical: N
  🟡 major:    N
  🔵 minor:    N
  ⚪ architectural（仅建议）: N

待观察候选: M 条（未确认是否入池）
```

### 7. 询问是否进入修复阶段

**前置条件**：known 状态条目命中的 critical + major > 0。否则跳过修复直接走步骤 7b。

调用 `AskUserQuestion`：

- 问题：`体检完成（critical: N, major: N, minor: N）。是否立即修复？`
- 选项：
  1. **修复 critical + major（推荐）**
  2. **仅修 critical**
  3. **暂不修复**

> minor / architectural / pending / retired 永不进入修复列表。

### 7b. 询问是否入"待观察池"

若步骤 5b 抓到候选 > 0，调用 `AskUserQuestion`：

- 问题：`本次发现 M 条疑似新反模式，是否写入 arch-audit-pending-patterns.md 待观察？`
- 选项：
  1. **全部写入待观察池（推荐）** — append 到 pending 文件，每条分配 P-NNN 编号
  2. **挑选写入** — 主线程逐条 ask（仅在 M ≤ 5 时使用，避免过多打断）
  3. **不写入** — 仅保留在本次报告，不入池

**写入 pending 时**：每条 append 到 `arch-audit-pending-patterns.md` 的"## 待观察"段落，初始命中数 = 1，首次发现日期 = 今天。

> 月度评审：人工查看 pending 池，命中次数 ≥ 3 且误报低的模式，迁移到 checklist 转正为 known。

### 8. 逐项修复（同 v1）

修复列表 = critical（按路径排序）+ major（如用户选了"critical + major"）。

每项：
- 8.1 输出问题摘要
- 8.2 应用 `Edit`，记录 old_string / new_string
- 8.3 输出 diff 摘要
- 8.4 `AskUserQuestion`：保留续 / 撤销续 / 保留停 / 撤销停
- 撤销 = 反向 Edit（**不**用 `git checkout`）

### 9. 修复总结

```
✅ 修复阶段结束

  本次共处理：N 项
  ✓ 保留：N 项
  ↩ 撤销：N 项
  ⏸ 跳过（用户停止）：N 项

待观察池新增：M 条（编号 P-XXX ~ P-YYY）

下一步：
  - 查看 git diff 复核保留的修改
  - 跑测试 / 启动 dev server 验证
  - /fe-dev:commit 提交
  - 月度 review arch-audit-pending-patterns.md，把高频模式转正进 checklist
```

## 设计原则

1. **不与 code-review 重叠**：通用代码质量交给 code-review / ast-lint-mcp，arch-audit 专注"LLM 指纹"
2. **维度数量稳定**：6 个维度长期不变，规则在维度内累加，避免维度膨胀
3. **三态管理**：known / pending / retired，让 checklist 自洁，不会越积越脏
4. **自演化**：每次审计可捕获新模式入 pending，月度评审转正；工具越用越准
5. **知识库即资产**：`arch-audit-checklist.md` 可版本化、跨项目复用、社区贡献

## 范围声明

支持：审计 + 同会话逐项修复 + 新模式入待观察池。**不支持**：

- `--scope=feat` / `--scope=all`
- 修复状态持久化 / 断点续传
- 报告间历史对比 / 趋势
- 自动把 pending 转正为 known（需人工月度评审）
- 修复后自动重审

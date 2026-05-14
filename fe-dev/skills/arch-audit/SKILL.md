---
name: arch-audit
description: 架构与规范审计，从 6 个维度宏观体检代码（架构/规范/Vue/常量/定时/配置）。触发词: "arch audit", "架构审计", "arch-audit", "代码体检"
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(ls *), Bash(cat *), Bash(date *), Bash(mkdir *), Write, Edit, Agent, AskUserQuestion
---

# Arch Audit - 架构与规范审计

> 审计清单: `<skill-path>/references/arch-audit-checklist.md`
> 报告模板: `<plugin-root>/templates/audit-report.md`

针对"LLM 批量产出代码后想宏观体检"的场景。**先审计写报告，再可选地按报告逐项修复**。修复阶段全程逐项 ask 确认，可随时停止。

与 `/fe-dev:code-review` 的边界：

| | code-review | arch-audit |
|---|---|---|
| 视角 | 一行行看 diff | 抬头看全局 |
| 关注 | bug、安全、语义错误 | 架构、规范、配置、重复、定时器、最佳实践 |
| 输出 | 控制台行级报告 | `docs/audits/audit-{date}.md` 分章节落档 |
| 时机 | commit 前 | LLM 批量产出后 / 周期性体检 |

## 参数

- `<scope>`: 可选，审计范围
  - 不传（默认）— `--scope=diff`，审计工作区变更 + 最近 3 个 commit
  - `--scope=diff` — 同上
  - `--scope=feat` — **MVP 暂未实现**，提示用户走默认
  - `--scope=all` — **MVP 暂未实现**，提示用户走默认

## 使用方式

```
/fe-dev:arch-audit                  # 审计最近改动（默认 diff 模式）
/fe-dev:arch-audit --scope=diff     # 同上
```

## 6 项检查维度

| # | 维度 | diff 模式行为 |
|---|------|---------------|
| 1 | 技术架构 / 技术栈主流性 | 轻量：只看 diff 是否引入新依赖、新目录结构 |
| 2 | CLAUDE.md 规则符合度 | 全量审：读取项目 CLAUDE.md 逐条比对变更 |
| 3 | Vue（含 style）最佳实践 | 全量审：变更的 `.vue` 文件逐个核对 |
| 4 | 公共常量提取 | 全量审：变更里的硬编码字面量是否该抽常量 |
| 5 | 定时配置（cron/setInterval/轮询） | 全量审：变更里所有 timer 相关代码 |
| 6 | 项目配置合理性 | 轻量：仅当 diff 涉及 `package.json`/`nuxt.config`/`tsconfig`/`eslint*`/`stylelint*`/`.husky/` 时审 |

完整规则见 `<skill-path>/references/arch-audit-checklist.md`。

## 执行流程

### 1. 解析参数与环境

```bash
git rev-parse --is-inside-work-tree
```

非 git 仓库 → 报错退出。

`--scope=feat` 或 `--scope=all` → 输出：

```
💡 MVP 阶段仅支持 --scope=diff（最近改动）。
   --scope=feat / --scope=all 将在后续版本提供。
```

然后按 `diff` 模式继续。

### 2. 收集 diff 范围

把 4 个来源**合并去重**得到 `<changed_files>`：

```bash
# 1. 工作区已修改（tracked）
git diff --name-only

# 2. 暂存区
git diff --cached --name-only

# 3. 未追踪但未被 .gitignore 排除（LLM 新建文件常落在这）
git ls-files --others --exclude-standard

# 4. 最近 N 个 commit（N = min(3, 仓库总 commit 数 - 1)）
COMMIT_COUNT=$(git rev-list --count HEAD)
if [ "$COMMIT_COUNT" -gt 3 ]; then
  git diff --name-only HEAD~3 HEAD
elif [ "$COMMIT_COUNT" -gt 1 ]; then
  git diff --name-only HEAD~$((COMMIT_COUNT - 1)) HEAD
else
  git diff-tree --no-commit-id --name-only -r HEAD
fi
```

**为什么把未追踪文件也算进来**：LLM 写代码常先 `Write` 新建文件，这些文件处于 untracked 状态。如果只看 `git diff`，首次审计会把所有新增文件漏掉。

**排除自身产出物**：合并后过滤掉 `docs/audits/**`，避免审计报告自身被纳入下一次审计形成循环：

```bash
grep -v '^docs/audits/'
```

无变更 → 输出「最近无变更，无需审计」退出。

### 3. 准备报告文件

```bash
mkdir -p docs/audits
DATE=$(date +%Y-%m-%d-%H%M)
REPORT=docs/audits/audit-${DATE}.md
```

**.gitignore 提示**：若 `.gitignore` 中没有 `docs/audits/`，**首次运行时**输出一次性提示：

```
💡 建议将 docs/audits/ 加入 .gitignore（个人体检记录，无需入库）。
   团队需要追踪审计历史可忽略此提示。
```

**填充模板**：

1. 用 `Read` 读取 `<plugin-root>/templates/audit-report.md` 作为骨架
2. 替换以下占位符（用 `Write` 整体输出到 `$REPORT`，**不要**用 Edit 多次替换）：

| 占位符 | 替换为 | 来源 |
|---|---|---|
| `{{DATE}}` | 当前日期时间 | `date "+%Y-%m-%d %H:%M"` |
| `{{SCOPE}}` | `diff` | 当前参数值 |
| `{{COMMIT_HASH}}` | 当前 HEAD short hash | `git rev-parse --short HEAD` |
| `{{BRANCH}}` | 当前分支名 | `git branch --show-current` |
| `{{CHANGED_FILE_COUNT}}` | 变更文件总数 | 第 2 步收集到的列表条数 |
| `{{CHANGED_FILES}}` | 变更文件清单 | 第 2 步收集到的列表，每行一个 |
| `{{CLAUDE_MD_STATUS}}` | `存在` / `不存在` | 第 4 步检测结果 |

### 4. 读取所有适用的 CLAUDE.md（多层支持）

monorepo / 插件仓库可能在子目录下存在子 CLAUDE.md（如 `fe-dev/CLAUDE.md` 只作用于 `fe-dev/**`）。处理逻辑：

```bash
# 找出所有 CLAUDE.md（排除 node_modules / .git）
find . -name 'CLAUDE.md' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*'
```

**作用域映射**：

- `./CLAUDE.md` → 作用于整个仓库所有变更文件
- `<dir>/CLAUDE.md` → 仅作用于 `<dir>/**` 下的变更文件
- 多层嵌套时，**最近的 CLAUDE.md 优先**（子目录规则覆盖父目录）

**判断流程**：对 `<changed_files>` 中每个文件，向上查找最近的 CLAUDE.md，作为第 2 项审计该文件时的对比基线。

**全无 CLAUDE.md** → 第 2 项标记「未找到任何 CLAUDE.md，跳过本项」。
**部分文件无对应 CLAUDE.md** → 该文件在第 2 项标记"无适用 CLAUDE.md"，其余文件正常审。

### 5. 逐项审计（主线程串行驱动）

读取 `<skill-path>/references/arch-audit-checklist.md`，按 6 项顺序执行。

**收集证据策略**：每项内部按需 grep / 读文件。如果某项要扫的文件 > 10 个，主线程**可派一个 `Explore` 子代理**去找证据，主线程拿回证据后自己组织措辞，保证报告风格一致。

**置信度门槛**：与 `code-review-rules.md` 一致，只报告置信度 ≥ 80% 的问题，不猜测。

**严重度分级**：

- 🔴 **critical**：内存泄漏、安全风险、严重违反 CLAUDE.md 硬规则
- 🟡 **major**：可维护性差、最佳实践违反、需修复
- 🔵 **minor**：建议性、风格偏好
- ⚪ **architectural**：架构选型建议，**绝不自动改**，仅给人类决策参考

**逐项完成后立即写入报告对应章节**：用 `Edit` 把该章节模板里的 "✅ 本维度未发现问题" 替换为实际问题清单，并更新顶部「总览」表格的对应行计数。不要全跑完再一次性写——避免中途出错丢失进度。

### 6. 写入报告并输出摘要

报告写完后，控制台输出：

```
✅ 架构审计完成

报告：docs/audits/audit-2026-05-14-1530.md

汇总：
  🔴 critical: N
  🟡 major:    N
  🔵 minor:    N
  ⚪ architectural（仅建议）: N
```

### 7. 询问是否进入修复阶段

**前置条件**：critical + major 之和 > 0。否则跳过修复阶段，直接结束。

调用 `AskUserQuestion`：

- 问题：`审计完成（critical: N, major: N, minor: N）。是否立即修复 critical + major？`
- 选项：
  1. **修复 critical + major（推荐）** — 进入逐项修复
  2. **仅修 critical** — 只修最严重的，major 保留在报告
  3. **暂不修复** — 退出，自己看报告手动处理

> minor 永不进入自动修复列表；architectural 同样不进入，仅保留在报告供人决策。

→ 用户选"暂不修复" → 输出"已生成报告，未做任何代码修改" 退出
→ 用户选其他 → 进入第 8 步

### 8. 逐项修复（仅在用户同意修复后执行）

按以下顺序组装修复列表：

- 用户选 **"修复 critical + major"** → 列表 = 全部 critical（按路径排序）+ 全部 major（按路径排序）
- 用户选 **"仅修 critical"** → 列表 = 全部 critical，**major 项整批跳过保留在报告**
- minor 和 architectural **任何情况下都不进列表**

对列表中每一项执行：

#### 8.1 输出问题摘要

```
[N/总数] 🔴 critical | path/to/file.vue:42
问题：<问题描述>
计划修改：<即将执行的修改概述>
```

#### 8.2 应用修改

- 用 `Read` 读目标文件确认上下文
- 用 `Edit` 应用修改
- **关键**：记录每次 Edit 的 `old_string` 和 `new_string`，用于后续撤销

#### 8.3 输出 diff 摘要

简短列出本次修改的文件、行数变化、关键变更。

#### 8.4 询问用户处置

调用 `AskUserQuestion`：

- 问题：`此项修改是否保留？（剩余 M 项）`
- 选项：
  1. **保留并继续下一项（推荐）** — 进入下一项
  2. **撤销此项** — 反向 Edit 回退，继续下一项
  3. **保留并停止剩余项** — 不再修后面的项，结束本次修复
  4. **撤销此项并停止剩余项** — 撤销当前 + 不再修后面，结束

**撤销实现**：
反向调用 `Edit`，把记录的 `new_string` 作为 old，记录的 `old_string` 作为 new，精准回到改前状态。**不要**用 `git checkout`（会冲掉用户原本的其他未提交改动）。

#### 8.5 循环到列表末尾或用户停止

### 9. 修复总结

修复阶段结束后输出：

```
✅ 修复阶段结束

  本次共处理：N 项
  ✓ 保留：N 项
  ↩ 撤销：N 项
  ⏸ 跳过（用户停止）：N 项

下一步建议：
  - 查看 git diff 复核所有保留的修改
  - 跑测试 / 启动 dev server 验证功能正常
  - 满意后 /fe-dev:commit 提交
```

**注意**：本次审计报告**不会更新**已修项的状态。若想看修复后的最新报告，重新跑一次 `/fe-dev:arch-audit` 即可（新 diff 范围已是修复后的状态）。

## MVP 范围声明

本版本（MVP）支持：审计 + 同会话内逐项修复（critical + major）。**不支持**：

- `--scope=feat` / `--scope=all` 两档范围
- 修复状态持久化 / 断点续传（停下后未修项保留在报告作为人工提醒）
- 历史对比：读取上一份报告 diff critical/major 数量，给出趋势
- 与 `/fe-dev:commit` 集成：`--audit` 参数前置体检
- 修复后自动重审验证

后续根据使用反馈再决定是否扩展。

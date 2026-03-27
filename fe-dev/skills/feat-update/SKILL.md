---
name: feat-update
description: 需求变更管理，追加变更内容到 extra.md 并生成变更计划。触发词: "feat update", "需求变更", "变更管理"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Feat Update - 需求变更管理

> 共享约定: `<skill-path>/references/feat-utils.md`

## 使用方式

```bash
/fe-dev:feat-update 未分配角色的用户，默认无任何权限   # 直接带参数
/fe-dev:feat-update                                     # 交互式
```

## 执行流程

### 步骤 1: 解析参数

有参数 → 直接使用；无参数 → AskUserQuestion 交互获取（功能新增 / 功能修改 / Bug 修复 / 其他）

### 步骤 2: 获取当前 feat

从 Git 分支获取 `featName`。不在 feat 分支上则提示切换。

### 步骤 3: 追加到 extra.md

```markdown
---
## {timestamp}
> 类型: 需求变更 | 记录人: {git user.name}
### 变更内容
{changeContent}
```

### 步骤 4: 读取现有计划

读取 `dev/plan.md`，解析任务列表。

### 步骤 5: AI 分析变更影响

返回：受影响的现有任务 / 需要新增的任务 / 需要修改的任务

### 步骤 6: 询问处理方式

AskUserQuestion：
- **自动合并** → 新任务追加到 plan.md 末尾
- **手动编辑** → 用户自行调整
- **仅保存** → 保存到 `dev/change-{date}.md`

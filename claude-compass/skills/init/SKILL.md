---
name: init
description: 为项目链接团队共享规则。创建目录结构，建立符号链接，配置 SessionStart Hook。
trigger: |
  当用户说"初始化规则"、"接入团队规范"、"init rules"、"setup rules"时触发。
type: rigid
---

# Init

为当前项目链接团队共享规则。**Rigid Skill**，严格按步骤执行。

> **职责边界**：本 Skill 只做规则链接，不生成 CLAUDE.md。如需生成，请使用 `/claude-compass:claude-init`。

## Checklist

- [ ] **检测环境**：确认共享规则源目录存在，当前目录是 Git 仓库
- [ ] **创建目录结构**：创建 `.claude/rules/project/`
- [ ] **链接共享规则**：将共享规则源链接到 `.claude/rules/shared/`
- [ ] **配置 Hook**：在 `.claude/settings.json` 中添加 SessionStart 检查 Hook
- [ ] **验证完整性**：检查链接有效
- [ ] **输出摘要**

## 步骤详情

### Step 1: 检测环境

```bash
RULES_SOURCE="$HOME/.claude/skills/claude-compass/rules"
ls "$RULES_SOURCE" > /dev/null 2>&1 || echo "ERROR: 共享规则源不存在"
git rev-parse --is-inside-work-tree > /dev/null 2>&1 || echo "ERROR: 不是 Git 仓库"
```

如果不满足，输出：
> 请先安装 claude-compass skill：
> `npx skills add <your-org>/claude-compass -g -y`（替换 `<your-org>` 为团队组织名）

### Step 2: 创建目录结构

```bash
mkdir -p .claude/rules/project
```

### Step 3: 链接共享规则

```bash
RULES_SOURCE="$HOME/.claude/skills/claude-compass/rules"
ln -sfn "$RULES_SOURCE" .claude/rules/shared
```

### Step 4: 配置 Hook

在 `.claude/settings.json` 中添加（合并已有配置，不覆盖）：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "command": "bash $HOME/.claude/skills/claude-compass/scripts/session-check.sh",
        "description": "检查团队共享规则状态"
      }
    ]
  }
}
```

### Step 5: 提示规则禁用功能

告知用户：如需在本项目中禁用某些共享规则，可创建 `.claude/rules/shared/.disabled` 文件，每行写一个要禁用的规则文件相对路径（相对于 shared 目录），例如：

```
frontend/css-standards.md
git-conventions.md
```

Claude Code 加载规则时会跳过 `.disabled` 中列出的文件。

### Step 6: 验证并输出摘要

```
规则链接完成！

  创建的文件：
    .claude/rules/shared/    → 链接到共享规则
    .claude/rules/project/   → 项目特有规则目录

  下一步：
    /claude-compass:claude-init   生成 CLAUDE.md（如尚未生成）

  可用命令：
    /claude-compass:claude-init   生成 CLAUDE.md
    /claude-compass:sync          同步最新团队规则
    /claude-compass:create        创建新的共享规则
    /claude-compass:check         检查规则健康状态

  提示：
    如需禁用某些共享规则，创建 .claude/rules/shared/.disabled 文件
```

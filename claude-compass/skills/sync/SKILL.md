---
name: sync
description: 同步团队共享规则到当前项目。检查链接完整性，验证规则文件存在。
trigger: |
  当用户说"同步规则"、"更新规则"、"拉取最新规范"、
  "sync rules"、"update rules"时触发。
type: rigid
---

# Sync

同步团队共享规则。**Rigid Skill**，严格按步骤执行。

## Checklist

- [ ] **检查规则源 Git 状态**：拉取最新规则
- [ ] **版本对比**：读取远程 SKILL.md 的 version 字段，与本地对比
- [ ] **检查链接完整性**：验证 `.claude/rules/shared` 符号链接有效
- [ ] **修复断裂链接**：链接无效则重新创建
- [ ] **验证规则文件**：扫描 `.claude/rules/shared/` 下所有 `.md` 文件，确认可读
- [ ] **对比变更**：列出共享规则的变更内容
- [ ] **输出同步结果**

## 执行逻辑

### 检查规则源 Git 状态

```bash
RULES_SOURCE="$HOME/.claude/skills/claude-compass"

# 检查规则源是否为 git 仓库
if [ -d "$RULES_SOURCE/.git" ]; then
  echo "检查规则源更新..."
  git -C "$RULES_SOURCE" fetch --dry-run 2>&1
  # 如果有远程更新
  LOCAL=$(git -C "$RULES_SOURCE" rev-parse HEAD)
  REMOTE=$(git -C "$RULES_SOURCE" rev-parse @{u} 2>/dev/null || echo "")
  if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    echo "团队规则有新版本，是否拉取最新？(git -C $RULES_SOURCE pull)"
    # 询问用户确认后执行 git pull
  else
    echo "规则源已是最新"
  fi
else
  echo "规则源不是 Git 仓库，跳过远程检查"
fi
```

### 版本对比

拉取/检查后，读取规则源 `SKILL.md` 的 `version` 字段与当前已知版本对比：

```bash
RULES_SOURCE="$HOME/.claude/skills/claude-compass"
VERSION=$(grep '^version:' "$RULES_SOURCE/SKILL.md" 2>/dev/null | awk '{print $2}')
echo "当前规则版本：${VERSION:-未知}"
```

如果版本有变化，在输出结果中标注版本升级信息。

### 检查链接

```bash
LINK=".claude/rules/shared"
if [ -L "$LINK" ] && [ -e "$LINK" ]; then
  echo "共享规则链接有效"
else
  echo "链接断裂，重新创建..."
  RULES_SOURCE="$HOME/.claude/skills/claude-compass/rules"
  ln -sfn "$RULES_SOURCE" "$LINK"
fi
```

### 验证规则文件

扫描 `.claude/rules/shared/` 下所有 `.md` 文件（含子目录），逐个检查是否可读：
- 可读 → 标记 OK
- 不可读 → 输出警告

### 对比变更

如果规则源是 Git 仓库，展示最近的变更：

```bash
RULES_SOURCE="$HOME/.claude/skills/claude-compass"
if [ -d "$RULES_SOURCE/.git" ]; then
  git -C "$RULES_SOURCE" log --oneline -5 -- rules/
fi
```

### 输出结果

```
同步结果：
  链接状态：正常
  规则源：已是最新 / 已拉取最新（commit abc1234）
  规则文件：9/9 有效
    通用：3 条
    前端：6 条
  最近变更：
    abc1234 rule: add component-communication
    def5678 rule: update css-standards
```

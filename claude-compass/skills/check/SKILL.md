---
name: check
description: 检查当前项目的团队规则配置健康状态。验证链接、规则文件、版本。可由 SessionStart Hook 自动调用。
trigger: |
  当用户说"检查规则"、"规则状态"、"check rules"时触发，
  或由 SessionStart Hook 自动触发。
type: rigid
---

# Check

快速健康检查，输出简洁。

## 检查项

- [ ] 共享规则源存在（Skill 已安装）
- [ ] `.claude/rules/shared` 链接有效
- [ ] `.claude/rules/shared/` 下规则文件可读
- [ ] 检查 `.disabled` 文件并标注已禁用规则
- [ ] 按分类统计规则数量（区分启用/禁用）
- [ ] Skill 版本是否为最新（如有 version 字段）

## 统计逻辑

扫描 `.claude/rules/shared/` 下所有 `.md` 文件，按目录分类统计：

```bash
SHARED=".claude/rules/shared"
# 根目录下的 .md 为通用规则
GENERAL=$(find "$SHARED" -maxdepth 1 -name "*.md" | wc -l)
# 子目录按目录名分类
# 例如 frontend/ 下的为前端规则
```

## 输出格式

一切正常时（无禁用）：
```
团队规则状态：正常
  通用规则：3 条
  前端规则：6 条
  共计：9 条（全部启用）
```

有禁用规则时：
```
团队规则状态：正常
  通用规则：3 条（1 条已禁用：git-conventions.md）
  前端规则：6 条
  共计：9 条（8 条启用，1 条禁用）
```

有问题时：
```
团队规则状态：需要修复
  - .claude/rules/shared 链接断裂 → 执行 /claude-compass:init
  - 共享规则源不存在 → 执行 npx skills add <your-org>/claude-compass -g -y
```

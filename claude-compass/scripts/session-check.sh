#!/bin/bash
# 由 SessionStart Hook 调用，快速检查规则状态
# 设计原则：< 1 秒完成，不阻塞会话启动
# 注意：不使用 set -e，确保所有检查项都执行完毕

RULES_SOURCE="${HOME:?}/.claude/skills/claude-compass/rules"
LINK_PATH=".claude/rules/shared"

ISSUES=()

# 检查 Skill 是否安装
if [ ! -d "$RULES_SOURCE" ]; then
  ISSUES+=("共享规则 Skill 未安装，执行: npx skills add <your-org>/claude-compass -g -y")
fi

# 检查符号链接（仅在已初始化的项目中检查）
if [ -d ".claude/" ]; then
  if [ ! -L "$LINK_PATH" ]; then
    ISSUES+=("共享规则链接缺失，执行: /claude-compass:init")
  elif [ ! -e "$LINK_PATH" ]; then
    ISSUES+=("共享规则链接断裂（目标不存在），执行: /claude-compass:init")
  fi
fi

# 检查 .disabled 文件（仅提示，不报错）
DISABLED_FILE=".claude/rules/shared/.disabled"
DISABLED_COUNT=0
if [ -f "$DISABLED_FILE" ]; then
  DISABLED_COUNT=$(grep -c -v '^[[:space:]]*$' "$DISABLED_FILE" 2>/dev/null || echo 0)
fi

# 输出（仅有问题或禁用规则时才输出，不干扰正常工作）
if [ ${#ISSUES[@]} -gt 0 ] || [ "$DISABLED_COUNT" -gt 0 ]; then
  echo "--- 团队规则检查 ---"
  for issue in "${ISSUES[@]}"; do
    echo "  ! $issue"
  done
  if [ "$DISABLED_COUNT" -gt 0 ]; then
    echo "  i 已禁用 $DISABLED_COUNT 条共享规则（见 .claude/rules/shared/.disabled）"
  fi
  echo "-------------------"
fi

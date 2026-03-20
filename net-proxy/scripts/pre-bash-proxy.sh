#!/usr/bin/env bash
# pre-bash-proxy.sh — PreToolUse hook for Claude Code
# Intercepts npm/pnpm/yarn install commands and injects proxy env vars
set -euo pipefail

# Read hook input from stdin
INPUT=$(cat)

# Extract the command from tool_input
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# If no command, pass through
[ -z "$COMMAND" ] && exit 0

# Check if command matches package install patterns
# Match: npm install, npm ci, pnpm install, pnpm ci, yarn install, yarn (alone)
if ! echo "$COMMAND" | grep -qE '(npm|pnpm)\s+(install|ci)|yarn(\s+install)?(\s*$)'; then
  exit 0
fi

# Detect proxy
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROXY=$(bash "$SCRIPT_DIR/detect-proxy.sh" 2>/dev/null || true)

# No proxy found — pass through without modification
[ -z "$PROXY" ] && exit 0

# Build modified command with proxy env vars
MODIFIED="HTTP_PROXY=$PROXY HTTPS_PROXY=$PROXY $COMMAND"

# Output hook response: modify the tool input
jq -n --arg cmd "$MODIFIED" --arg reason "Injected proxy: $PROXY" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    permissionDecisionReason: $reason,
    updatedInput: {
      command: $cmd
    }
  }
}'

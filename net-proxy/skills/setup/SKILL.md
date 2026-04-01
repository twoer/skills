---
name: setup
description: 一键配置代理 Hook。触发词: "net-proxy setup", "配置代理", "setup proxy"
allowed-tools:
  - Bash(bash *)
  - Bash(chmod *)
  - Bash(realpath *)
  - Bash(jq *)
  - Bash(cat *)
  - Read
  - Edit
---

# Setup

一键将代理 Hook 配置写入 `~/.claude/settings.json`，配置后所有 npm/pnpm install 命令自动携带代理。

## 执行流程

### 1. 检测代理

```bash
bash "$(dirname "$0")/../../scripts/detect-proxy.sh"
```

如果脚本路径无法解析，使用绝对路径：

```bash
bash "<plugin-install-dir>/net-proxy/scripts/detect-proxy.sh"
```

- 检测到代理 → 展示代理地址，继续
- 未检测到代理 → 提示「未检测到系统代理，请先配置代理后重试」，退出

### 2. 检查 Hook 是否已存在

读取 `~/.claude/settings.json`，检查 `hooks.PreToolUse` 中是否已有 command 包含 `pre-bash-proxy.sh` 的条目。

- 已存在 → 提示「Hook 已配置，无需重复操作」，退出
- 不存在 → 继续

如果文件不存在或没有 `hooks` 字段，视为不存在，继续。

### 3. 写入 Hook 配置

读取现有 `~/.claude/settings.json`，**合并**（不覆盖）以下内容：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash <absolute-path-to-pre-bash-proxy.sh>",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

其中 `<absolute-path-to-pre-bash-proxy.sh>` 需要替换为实际绝对路径。

路径获取方式：

```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK_PATH=$(realpath "$SCRIPT_DIR/../../scripts/pre-bash-proxy.sh")
echo "$HOOK_PATH"
```

**合并规则**:
- 如果 `hooks.PreToolUse` 数组已有 matcher 为 `Bash` 的条目 → 在该条目的 `hooks` 数组中追加
- 如果没有 matcher 为 `Bash` 的条目 → 新增整个 matcher 组
- 保留所有已有的 hooks 和其他 settings
- 如果 `hooks` 或 `hooks.PreToolUse` 不存在，创建它们

### 4. 验证

```bash
jq -e '.hooks.PreToolUse[] | select(.matcher == "Bash") | .hooks[] | select(.type == "command") | .command' ~/.claude/settings.json
```

输出刚写入的 command 且 exit 0 = 成功。

### 5. 提示用户

输出：

```
Hook 配置完成！

检测到代理: <proxy-url>

Hook 已写入 ~/.claude/settings.json。
请重启 Claude Code 或执行 /hooks 使配置生效。

配置生效后，所有 npm/pnpm install 命令将自动携带代理。
```

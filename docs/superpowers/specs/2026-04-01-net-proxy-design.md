# net-proxy Plugin Design

自动检测系统代理并注入到 npm/pnpm install 命令中，解决网络问题导致的包安装失败。

## 背景

在国内网络环境下，Claude Code 执行 `npm install` / `pnpm install` 时常因网络问题失败。用户虽然系统配置了代理，但 Claude Code 的 Bash 工具执行命令时不会自动继承系统代理设置。

## 方案

Skill + 自动配置 Hook。用户通过 `/net-proxy:setup` 一键将 Hook 注入 `settings.json`，之后所有 npm/pnpm install 命令自动携带代理。

## 目录结构

```
net-proxy/
├── CLAUDE.md                  # plugin 说明（命令列表）
├── README.md                  # 安装和使用文档
├── scripts/
│   └── detect-proxy.sh        # 代理检测脚本（被 hook 和 skill 共用）
└── skills/
    ├── proxy/
    │   └── SKILL.md            # 检测/测试代理状态
    ├── install/
    │   └── SKILL.md            # 手动带代理安装依赖
    └── setup/
        └── SKILL.md            # 一键配置 Hook
```

## 代理检测策略 (`detect-proxy.sh`)

按优先级依次检测，找到第一个可用代理即返回：

1. **环境变量**：`HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` / `http_proxy` / `https_proxy` / `all_proxy`
2. **macOS 系统代理**：
   - `networksetup -getwebproxy Wi-Fi` → HTTP 代理
   - `networksetup -getsecureproxy Wi-Fi` → HTTPS 代理
   - 遍历所有网络服务（Wi-Fi、Ethernet 等）直到找到启用的代理
3. （后续扩展）Linux 系统代理：读取 `/etc/environment`、GNOME/KDE 设置

输出格式：`http://host:port` 或 `http://user:pass@host:port`

检测失败时输出空字符串，调用方据此决定是否注入。

## Skills

### `/net-proxy:setup`

一键配置 Hook。执行流程：

1. 调用 `detect-proxy.sh` 检测当前代理
2. 将检测结果展示给用户确认
3. 读取 `~/.claude/settings.json`
4. 在 `hooks.PreToolUse` 数组中添加 hook 条目（如已存在则跳过）
5. 写回 `settings.json`
6. 提示用户重启 Claude Code 生效

Hook 配置格式：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/net-proxy/scripts/pre-bash-proxy.sh"
          }
        ]
      }
    ]
  }
}
```

### `/net-proxy:proxy`

检测并展示当前代理配置状态。

| 子命令 | 说明 |
|--------|------|
| （无参数）| 显示检测到的代理地址，以及各检测源的状态 |
| `test` | 用检测到的代理执行 `curl -x <proxy> https://registry.npmjs.org/` 测试连通性，报告成功/失败和延迟 |

### `/net-proxy:install [args...]`

手动带代理执行 npm/pnpm install。

1. 检测项目使用的包管理器（npm/pnpm/yarn，通过 lock 文件判断）
2. 调用 `detect-proxy.sh` 获取代理
3. 执行 `HTTP_PROXY=<proxy> HTTPS_PROXY=<proxy> <pkg-manager> install <args>`

## Hook 拦截机制 (`pre-bash-proxy.sh`)

作为 `PreToolUse` hook 注册，在 Claude Code 执行 Bash 命令前触发：

1. 从 stdin 读取 Claude Code 传入的 JSON（包含待执行的命令）
2. 检查命令是否匹配 `npm install`、`pnpm install`、`yarn install`、`yarn`（无参数时等同 install）、`npm ci`、`pnpm ci`
3. 如果匹配，调用 `detect-proxy.sh` 检测代理
4. 检测到代理 → 返回 JSON 指示修改命令，在原命令前注入 `HTTP_PROXY=xxx HTTPS_PROXY=xxx`
5. 未检测到代理 → 不修改，原命令正常执行

Hook 返回格式（修改命令时）：

```json
{
  "decision": "approve",
  "reason": "Injected proxy settings",
  "modifiedCommand": "HTTP_PROXY=http://127.0.0.1:7890 HTTPS_PROXY=http://127.0.0.1:7890 npm install"
}
```

## 安装方式

```bash
# 安装插件
/plugin marketplace add twoer/skills
/plugin install net-proxy@skills

# 配置 Hook（一次性）
/net-proxy:setup
```

安装插件和现有 repo/fe-dev 一致。`setup` 是额外的一步，但完全自动化。

## 跨平台支持

| 平台 | 代理检测 | 状态 |
|------|----------|------|
| macOS | 环境变量 + networksetup | 首版支持 |
| Linux | 环境变量 | 首版支持 |
| Windows | 环境变量 | 首版支持（通过 Git Bash/WSL） |

macOS 的 `networksetup` 是首版唯一支持的系统级代理检测。Linux/Windows 的系统代理检测作为后续扩展。

## 不做什么

- 不做代理服务器本身（只检测和注入已有代理）
- 不做 npm registry 镜像切换（那是另一个问题）
- 不做全局环境变量持久化（只在当次命令执行时注入）

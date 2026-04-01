# net-proxy

自动检测系统代理并注入到 npm/pnpm install 命令中，解决网络问题导致的包安装失败。

## 安装

```bash
/plugin marketplace add twoer/skills
/plugin install net-proxy@skills
```

## 首次使用

安装后执行一次 `/net-proxy:setup` 配置 Hook：

```
/net-proxy:setup
```

配置完成后，所有 npm/pnpm install 命令会自动携带代理，无需手动操作。

## 命令

### `/net-proxy:setup`

一键配置 Hook。检测系统代理并将 Hook 写入 `~/.claude/settings.json`。

| 场景 | 说明 |
|------|------|
| 首次安装 | 检测代理 → 写入 Hook → 提示重启生效 |
| 已配置 | 提示 Hook 已存在，跳过 |

### `/net-proxy:proxy`

查看代理状态。

| 子命令 | 说明 |
|--------|------|
| （无参数）| 显示检测到的代理地址和来源 |
| `test` | 测试代理连通性（curl npm registry） |

### `/net-proxy:install [args...]`

手动带代理执行 npm/pnpm install。

自动检测项目包管理器（npm/pnpm/yarn），注入代理环境变量后执行安装。

## 代理检测顺序

1. 环境变量（HTTP_PROXY / HTTPS_PROXY / ALL_PROXY 等）
2. macOS 系统代理（networksetup）

## 支持的包管理器命令

- `npm install` / `npm ci`
- `pnpm install` / `pnpm ci`
- `yarn install` / `yarn`

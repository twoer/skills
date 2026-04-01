---
name: install
description: 用代理执行 npm/pnpm install。触发词: "proxy install", "代理安装", "带代理安装"
allowed-tools:
  - Bash(npm *)
  - Bash(pnpm *)
  - Bash(yarn *)
  - Bash(bash *)
  - Bash(ls *)
---

# Install

手动带代理执行 npm/pnpm install。自动检测包管理器和代理。

## 参数

- `[args...]`: 传给 install 命令的额外参数，如包名、--save-dev 等

## 使用方式

```
/net-proxy:install
/net-proxy:install lodash
/net-proxy:install --save-dev typescript
```

## 参数解析

- 所有参数直接传递给包管理器的 install 命令

## 执行流程

### 1. 检测代理

```bash
bash "<scripts-dir>/detect-proxy.sh"
```

- 检测到代理 → 继续
- 未检测到代理 → 提示「未检测到系统代理。请先配置代理后重试，或使用 /net-proxy:proxy 查看状态」，退出

### 2. 检测包管理器

通过 lock 文件判断：

```bash
if [ -f "pnpm-lock.yaml" ]; then
  PKG_MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
  PKG_MANAGER="yarn"
else
  PKG_MANAGER="npm"
fi
```

### 3. 执行安装

```bash
HTTP_PROXY=<proxy> HTTPS_PROXY=<proxy> <pkg-manager> install <args>
```

根据包管理器不同：
- npm: `HTTP_PROXY=<proxy> HTTPS_PROXY=<proxy> npm install <args>`
- pnpm: `HTTP_PROXY=<proxy> HTTPS_PROXY=<proxy> pnpm install <args>`
- yarn: `HTTP_PROXY=<proxy> HTTPS_PROXY=<proxy> yarn install <args>`

如果用户提供了 args，追加到命令末尾。

### 4. 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 未检测到代理 | 提示配置代理后退出 |
| install 失败 | 报告错误信息 |
| 当前目录无 package.json | 提示「未找到 package.json」后退出 |

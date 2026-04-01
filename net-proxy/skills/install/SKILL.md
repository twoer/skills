---
name: install
description: 用代理执行 npm/pnpm install。触发词: "proxy install", "代理安装", "带代理安装"
allowed-tools:
  - Bash(npm *)
  - Bash(pnpm *)
  - Bash(yarn *)
  - Bash(bash *)
  - Bash(find *)
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

### 1. 定位脚本路径

```bash
SCRIPTS_DIR=$(find ~/.claude/plugins/cache -path "*/net-proxy/scripts/detect-proxy.sh" 2>/dev/null | head -1 | xargs dirname)
```

如果 `SCRIPTS_DIR` 为空，提示用户手动指定路径。

### 2. 检测代理

```bash
PROXY=$(bash "$SCRIPTS_DIR/detect-proxy.sh")
```

- 检测到代理 → 继续
- 未检测到代理 → 提示「未检测到系统代理。请先配置代理后重试，或使用 /net-proxy:proxy 查看状态」，退出

### 3. 检测包管理器

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

### 4. 执行安装

```bash
HTTP_PROXY=$PROXY HTTPS_PROXY=$PROXY $PKG_MANAGER install <args>
```

根据包管理器不同：
- npm: `HTTP_PROXY=$PROXY HTTPS_PROXY=$PROXY npm install <args>`
- pnpm: `HTTP_PROXY=$PROXY HTTPS_PROXY=$PROXY pnpm install <args>`
- yarn: `HTTP_PROXY=$PROXY HTTPS_PROXY=$PROXY yarn install <args>`

如果用户提供了 args，追加到命令末尾。

### 5. 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 未检测到代理 | 提示配置代理后退出 |
| install 失败 | 报告错误信息 |
| 当前目录无 package.json | 提示「未找到 package.json」后退出 |

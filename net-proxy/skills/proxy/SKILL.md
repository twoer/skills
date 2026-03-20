---
name: proxy
description: 查看代理状态和测试连通性。触发词: "net-proxy", "代理状态", "proxy status", "检测代理"
allowed-tools:
  - Bash(bash *)
  - Bash(networksetup *)
  - Bash(curl *)
  - Bash(jq *)
  - Bash(find *)
---

# Proxy

检测系统代理状态，测试代理连通性。

## 参数

- `test`: 可选，测试代理连通性

## 使用方式

```
/net-proxy:proxy        # 查看代理状态
/net-proxy:proxy test   # 测试连通性
```

## 参数解析

- 参数为空或不含 `test` → 显示代理状态
- 参数包含 `test` → 显示代理状态 + 测试连通性

## 执行流程

### 1. 定位脚本路径

依次尝试以下路径，找到即停止：

```bash
# 优先从 marketplaces 目录查找
SCRIPTS_DIR=$(find ~/.claude/plugins/marketplaces -path "*/net-proxy/scripts/detect-proxy.sh" 2>/dev/null | head -1 | xargs dirname)

# 备选：从 cache 目录查找
if [ -z "$SCRIPTS_DIR" ]; then
  SCRIPTS_DIR=$(find ~/.claude/plugins/cache -path "*/net-proxy/scripts/detect-proxy.sh" 2>/dev/null | head -1 | xargs dirname)
fi
```

如果 `SCRIPTS_DIR` 仍为空，提示用户手动指定路径。

### 2. 检测代理

```bash
bash "$SCRIPTS_DIR/detect-proxy.sh"
```

### 3. 检测各来源状态

**注意：步骤 3 中的命令必须顺序执行，不要并行调用，避免某个命令失败导致其他命令被取消。**

逐项检查并输出报告：

```
## 代理状态

### 环境变量
- HTTPS_PROXY: <值或 未设置>
- HTTP_PROXY: <值或 未设置>
- ALL_PROXY: <值或 未设置>
- https_proxy: <值或 未设置>
- http_proxy: <值或 未设置>
- all_proxy: <值或 未设置>

### macOS 系统代理
- Wi-Fi HTTPS: <地址或 未启用>
- Wi-Fi HTTP: <地址或 未启用>

### 最终检测
- 使用代理: <代理地址 或 无>
- 来源: <环境变量/macOS系统代理>
```

环境变量检测（注意：逐个检查，避免 `${!var}` 等 bash 间接展开语法，因为用户 shell 可能是 zsh）：

```bash
echo "HTTPS_PROXY: ${HTTPS_PROXY:-未设置}" && \
echo "HTTP_PROXY: ${HTTP_PROXY:-未设置}" && \
echo "ALL_PROXY: ${ALL_PROXY:-未设置}" && \
echo "https_proxy: ${https_proxy:-未设置}" && \
echo "http_proxy: ${http_proxy:-未设置}" && \
echo "all_proxy: ${all_proxy:-未设置}"
```

macOS 系统代理检测（仅在 macOS 上执行，与上面环境变量检测顺序执行，不要并行）：

```bash
if command -v networksetup &>/dev/null; then
  echo "=== Wi-Fi HTTPS ===" && networksetup -getsecurewebproxy Wi-Fi && echo "" && echo "=== Wi-Fi HTTP ===" && networksetup -getwebproxy Wi-Fi
fi
```

### 4. 连通性测试（仅 `test` 参数）

如果参数包含 `test`：

1. 先检测代理（步骤 2）
2. 如果检测到代理：

```bash
curl -x <proxy-url> -o /dev/null -s -w "HTTP %{http_code} | 耗时: %{time_total}s\n" https://registry.npmjs.org/ --connect-timeout 5
```

3. 输出结果：

```
## 代理连通性测试

代理: <proxy-url>
目标: https://registry.npmjs.org/
结果: HTTP 200 | 耗时: 0.45s
状态: ✓ 连接正常
```

4. 如果未检测到代理：提示「未检测到代理，无法测试」

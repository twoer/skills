---
name: ui-setup
description: 配置 MasterGo API 访问凭证（PAT）。触发词: "ui setup", "配置 MasterGo", "ui-setup"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# UI Setup - MasterGo API 配置

配置 MasterGo Personal Access Token，供 ui-add、ui-gen、ui-update 调用 DSL API。支持多个 MasterGo 实例（公有云 + 私有化部署），按 URL 域名自动匹配。

> 共享约定: `<skill-path>/references/ui-utils.md`

## 配置文件格式

`<skill-path>/config/mastergo.json` — 用户级，按域名索引多组凭证：

```json
{
  "accounts": {
    "mastergo.iflytek.com": {
      "pat": "mg_xxx",
      "noproxy": true
    },
    "mastergo.com": {
      "pat": "mg_yyy"
    }
  }
}
```

> 兼容旧格式：如果文件中存在顶层 `pat` 字段（旧格式），自动迁移为 `accounts` 格式。

## 执行流程

### 步骤 1: 检查现有配置

读取 `<skill-path>/config/mastergo.json`：

**旧格式迁移**：如果存在顶层 `pat` 字段，自动转换：
```json
// 旧格式
{ "pat": "mg_xxx", "base_url": "https://mastergo.iflytek.com", "noproxy": true }
// → 新格式
{ "accounts": { "mastergo.iflytek.com": { "pat": "mg_xxx", "noproxy": true } } }
```
转换后写回文件。

**展示已有账户**：列出所有已配置的域名和 PAT 末 4 位：
```
已配置的 MasterGo 账户:
  1. mastergo.iflytek.com — PAT: mg_****1f25 (noproxy)
  2. mastergo.com — PAT: mg_****a3b2
```

询问用户：添加新账户 / 更新已有账户 / 退出。

### 步骤 2: 获取信息

使用 AskUserQuestion 询问用户：

**问题 1**: MasterGo 服务地址
- 提示：如 `https://mastergo.iflytek.com`（私有化）或 `https://mastergo.com`（公有云）
- 如果选择更新已有账户，使用已有地址

**问题 2**: 请输入该实例的 Personal Access Token
- 提示：格式为 `mg_` 开头，在对应 MasterGo 平台「个人设置 → API 管理」中创建

**PAT 校验**：
- 不以 `mg_` 开头 → 提示格式错误，重新询问
- 长度 <= 10 → 提示长度不足，重新询问

### 步骤 3: 验证 PAT

先尝试直接连接：
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-MG-UserAccessToken: {pat}" \
  -H "Content-Type: application/json" \
  "{base_url}/mcp/dsl?fileId=test&layerId=test"
```

如果返回 `000`（连接失败），检查是否因代理导致：
```bash
curl -s --noproxy '*' -o /dev/null -w "%{http_code}" \
  -H "X-MG-UserAccessToken: {pat}" \
  "{base_url}/mcp/dsl?fileId=test&layerId=test"
```
绕过代理后成功 → 标记 `noproxy: true`。

**认证判断**：
- 返回 `401` 或 `403` → PAT 无效，提示用户检查并重新输入
- 返回 `404` 或 `500` → PAT 有效（请求参数不合法，但认证通过）
- 返回 `200` → PAT 有效

### 步骤 4: 写入配置

从 `base_url` 提取域名（`new URL(base_url).hostname`）作为 key，**合并**写入 `accounts`：

```javascript
// 读取现有配置
const config = JSON.parse(readFile('mastergo.json')) || { accounts: {} }
// 添加/更新账户
config.accounts[hostname] = { pat, ...(noproxy ? { noproxy: true } : {}) }
// 写回
writeFile('mastergo.json', JSON.stringify(config, null, 2))
```

不覆盖其他域名的配置。

### 步骤 5: 更新 .gitignore

检查 `<skill-path>/.gitignore` 是否包含 `config/mastergo.json`，不包含则追加。

### 步骤 6: 输出摘要

```
MasterGo 账户配置完成

已配置的账户:
  1. mastergo.iflytek.com — PAT: mg_****1f25 (noproxy)
  2. mastergo.com — PAT: mg_****a3b2

配置文件: <skill-path>/config/mastergo.json
使用时根据设计稿 URL 自动匹配对应账户。
```

---
name: ui-setup
description: 配置 MasterGo API 访问凭证（PAT）。触发词: "ui setup", "配置 MasterGo", "ui-setup"
allowed-tools: Read, Grep, Glob, Bash
---

# UI Setup - MasterGo API 配置

配置 MasterGo Personal Access Token，供 ui-add、ui-gen、ui-update 调用 DSL API。

> **语言要求**：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

### 步骤 1: 检查现有配置

读取 `<skill-path>/config/mastergo.json`：
- 存在且 `pat` 字段非空 → 显示 `PAT: mg_****{last4}`，询问用户是否更新
- 不存在或 `pat` 为空 → 进入步骤 2

### 步骤 2: 获取 PAT

使用 AskUserQuestion 询问用户：

**问题 1**: 请输入 MasterGo Personal Access Token
- 提示：格式为 `mg_` 开头，在 MasterGo 平台「个人设置 → API 管理」中创建

**问题 2**: MasterGo 服务地址（默认：`https://mastergo.iflytek.com`）
- 提示：私有化部署请输入对应地址

**PAT 校验**：
- 不以 `mg_` 开头 → 提示格式错误，重新询问
- 长度 <= 10 → 提示长度不足，重新询问

### 步骤 3: 验证 PAT

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-MG-UserAccessToken: {pat}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "{base_url}/mcp/dsl?fileId=test&layerId=test"
```

- 返回 `401` 或 `403` → PAT 无效，提示用户检查并重新输入
- 返回 `404` 或 `500` → PAT 有效（请求参数不合法，但认证通过）
- 返回 `200` → PAT 有效

### 步骤 4: 写入配置

确保 `<skill-path>/config/` 目录存在，写入 `mastergo.json`：

```json
{
  "pat": "<用户输入的PAT>",
  "base_url": "<用户输入的base_url>"
}
```

### 步骤 5: 更新 .gitignore

检查 `<skill-path>/.gitignore` 是否包含 `config/mastergo.json`，不包含则追加。

### 步骤 6: 输出摘要

```
✅ MasterGo API 配置完成
🔑 PAT: mg_****{last4}
🌐 服务地址: {base_url}
📄 配置文件: <skill-path>/config/mastergo.json

现在可以使用 /fe-dev:ui-add 开始设计稿分析。
```

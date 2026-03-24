---
name: ui-update
description: 设计稿差异更新。触发词: "ui update", "设计稿更新", "ui-update"
allowed-tools: Read, Grep, Glob, Bash
---

# UI Update - 设计稿差异更新

基于新的设计稿数据，对比现有 spec 的差异，智能更新。

> 共享工具: `<skill-path>/references/ui-utils.md`
> **语言要求**：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

### 步骤 1: 获取 feat 名称

```bash
git branch --show-current
```

不以 `feat/` 开头则提示用户切换到功能分支。

### 步骤 2: 确定更新目标

读取 `{UI_DIR}/ui-pages.json`：

- 指定了 `page-id` 参数 → 查找对应页面
- 未指定 → 列出所有页面让用户选择（AskUserQuestion）

### 步骤 3: 读取现有 spec

路径：`{UI_DIR}/specs/{pageId}-spec.md`

不存在 → 提示先运行 `/fe-dev:ui-add`。

### 步骤 4: 获取新的设计数据

从 ui-pages.json 中读取该页面的 `mastergo` URL，重新获取 DSL 数据。

**4a. 读取 MasterGo 配置**

读取 `<skill-path>/config/mastergo.json`，获取 `pat` 和 `base_url`。
- 文件不存在或 `pat` 为空 → 提示用户先运行 `/fe-dev:ui-setup`，然后退出。

**4b. 解析 URL 并调用 DSL API**

（调用方式同 `/fe-dev:ui-add` 步骤 4b-4c，含短链解析和错误处理）

**4c. 更新 dsl_raw.json**

将新的 DSL 响应覆盖写入 `{UI_DIR}/specs/{pageId}-dsl-raw.json`。

**4d. 失败处理**

报错退出，提示用户检查 URL 或 PAT（运行 `/fe-dev:ui-setup` 重新配置）。

### 步骤 5: 生成差异报告

AI 对比新旧设计数据，按以下维度输出差异：

| 维度 | 检测内容 |
|------|---------|
| 布局 | 整体结构变化（分栏方向、区域增减） |
| Tokens | 颜色、圆角、字体、阴影等值变化 |
| 组件 | Element Plus 组件增减 |
| 字段 | 表单字段增减、类型变化、校验规则变化 |
| 交互 | 操作按钮、跳转逻辑变化 |

输出格式：

```
📐 布局变化:
  - 左右分栏 → 上下布局

🎨 Token 变化:
  - --el-color-primary: #02B3D6 → #0288D1

🧩 组件变化:
  + 新增: ElCaptcha
  - 移除: ElCheckbox (协议勾选)

📝 字段变化:
  + 新增: captcha (string, ElInput, required)

🖱️ 交互变化:
  - 登录: 新增验证码校验步骤
```

### 步骤 6: 用户确认

使用 AskUserQuestion：

- **全部采纳** — 用新数据覆盖 spec
- **逐项选择** — 用户选择要采纳的差异项
- **取消** — 不做任何修改

### 步骤 7: 更新文件

根据用户选择更新 spec，更新 ui-pages.json：
- `status` 重置为 `spec-done`
- `updatedAt` 更新为当前时间
- `tokens` 更新为新的 token 值

### 步骤 8: 输出摘要

```
✅ 设计规格已更新
📄 Spec: {UI_DIR}/specs/{pageId}-spec.md
🔄 变更: {n} 项

请审查更新后的 spec，确认后执行 /fe-dev:ui-gen 重新生成代码。
```

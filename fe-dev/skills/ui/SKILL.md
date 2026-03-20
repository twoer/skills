---
name: ui
description: UI 设计稿管理。触发词: "ui", "ui list", "设计稿列表"
allowed-tools: Read, Grep, Glob, Bash
---

# UI - 设计稿列表

查看 UI 设计稿转换状态。

> 共享工具: `<skill-path>/references/ui-utils.md`
> **语言要求**：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

### 步骤 1: 获取 feat 名称

```bash
git branch --show-current
```

不以 `feat/` 开头则提示用户切换到功能分支。

### 步骤 2: 读取 ui-pages.json

路径：`{UI_DIR}/ui-pages.json`

不存在 → 提示先运行 `/fe-dev:ui-add`。

### 步骤 3: 格式化输出

| ID | 名称 | 状态 | 目标文件 | MasterGo |
|----|------|------|---------|----------|
| login | 登录页 | ✅ converted | pages/login/index.vue | [链接](url) |
| register | 注册页 | 📝 spec-done | pages/register/index.vue | [链接](url) |

状态图标：
- `pending` → ⏳ 待处理
- `spec-done` → 📝 待生成
- `converted` → ✅ 已生成
- `reviewed` → 🎯 已质检

无页面时提示：

```
暂无设计稿页面。运行 /fe-dev:ui-add 添加。
```

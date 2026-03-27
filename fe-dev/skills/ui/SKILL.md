---
name: ui
description: UI 设计稿管理。触发词: "ui", "ui list", "设计稿列表"
allowed-tools: Read, Grep, Glob, Bash
---

# UI - 设计稿列表

查看 UI 设计稿转换状态。

> 共享约定: `<skill-path>/references/ui-utils.md`
> 语言要求：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

### 步骤 1: 分支验证

分支检查同 ui-utils.md "分支检查"。

### 步骤 2: 读取并输出

路径：`{UI_DIR}/ui-pages.json`

不存在 → 提示先运行 `/fe-dev:ui-add`。

存在 → 格式化输出：

| ID | 名称 | 状态 | 目标文件 | MasterGo |
|----|------|------|---------|----------|
| login | 登录页 | done | pages/login/index.vue | [链接](url) |

状态：`draft` → 已分析待生成，`done` → 已生成代码

无页面时提示：`暂无设计稿页面。运行 /fe-dev:ui-add 添加。`

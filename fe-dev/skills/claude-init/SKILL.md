---
name: claude-init
description: 为当前项目生成 CLAUDE.md 文件。触发词: "claude init", "生成 CLAUDE.md", "创建 CLAUDE.md"
---

# Claude Init - 生成 CLAUDE.md

分析项目结构和技术栈，生成 CLAUDE.md 文件。

## 执行流程

1. 读取 `package.json`（名称、版本、依赖）
2. 检测技术栈（框架、UI、状态管理、样式）
3. 生成目录树：`tree -L 3 -I 'node_modules|.nuxt|dist'`
4. 检测代码规范（ESLint、Prettier、Stylelint）
5. 写入 `CLAUDE.md`

## CLAUDE.md 模板

```markdown
# [项目名称]

## 项目简介
[请补充项目描述]

## 技术栈
- 框架：[自动检测] + Vue 3 + TypeScript
- UI 组件：[自动检测]
- 样式：[自动检测]
- 状态管理：[自动检测]

## 目录结构
[自动生成目录树]

## 开发指南
### 启动项目
npm run dev

### 构建项目
npm run build

## 代码规范
[根据项目配置自动生成]
```

## 错误处理

| 错误 | 处理 |
|------|------|
| 不是前端项目 | 提示无法识别技术栈 |
| CLAUDE.md 已存在 | AskUserQuestion：覆盖 / 追加 / 取消 |

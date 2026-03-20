---
name: index
description: Frontend development assistant for project initialization and management. Use this skill when the user wants to create a new frontend project, initialize a Nuxt4 project, set up a development environment, or when they mention "fe-dev", "前端开发", "初始化项目", "create project", "nuxt4 element plus", or need help with frontend project setup. Also trigger when the user is in an empty directory and wants to start coding a web application.
---

# Frontend Development Assistant

前端开发助手，专注于项目初始化和开发工作流管理。

## 命令索引

### 项目初始化

| 命令 | 说明 |
|------|------|
| `/fe-dev:init` | 初始化新项目，交互式选择模板 |
| `/fe-dev:claude-init` | 为当前项目生成 CLAUDE.md |

### Feature 工作流

| 命令 | 说明 |
|------|------|
| `/fe-dev:feat-new` | 创建新功能开发工作流（目录 + 分支） |
| `/fe-dev:feat-list` | 列出所有功能开发任务 |
| `/fe-dev:feat-show <name>` | 查看功能详情 |
| `/fe-dev:feat-log <name> <msg>` | 快速记录开发日志 |
| `/fe-dev:feat-req` | 查看当前 feat 的需求链接 |
| `/fe-dev:feat-req add <url> [alias]` | 添加需求链接 |
| `/fe-dev:feat-req sync [alias]` | 同步需求文档 |
| `/fe-dev:feat-gen [name]` | 生成开发计划 + 测试计划 |
| `/fe-dev:feat-gen [name] plan` | 只生成开发计划 |
| `/fe-dev:feat-gen [name] test` | 只生成测试计划 |
| `/fe-dev:feat-exec [name]` | 按计划自动执行开发任务 |
| `/fe-dev:feat-update [变更内容]` | 需求变更管理 |
| `/fe-dev:feat-done <name>` | 标记功能完成 |
| `/fe-dev:feat-archive <name>` | 归档已完成的功能 |

### Spec Kit

| 命令 | 说明 |
|------|------|
| `/fe-dev:spec api-sync` | 从 OpenAPI 规范生成 TypeScript 类型和 Service |

## 项目模板

### Element Plus Stack

- Nuxt 4 + Vue 3 + TypeScript
- Element Plus (UI)
- Tailwind CSS + SCSS
- Pinia (状态管理)
- WangEditor (富文本)

详见：references/element-setup.md

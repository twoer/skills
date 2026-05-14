---
name: index
description: Frontend development assistant for project initialization and management. Use this skill when the user wants to create a new frontend project, initialize a Nuxt4 project, set up a development environment, or when they mention "fe-dev", "前端开发", "初始化项目", "create project", "nuxt4 element plus", or need help with frontend project setup. Also trigger when the user is in an empty directory and wants to start coding a web application.
allowed-tools: Read, Grep, Glob
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
| `/fe-dev:feat-design [name]` | 生成前端详细设计文档（服务评审 + AI 执行） |
| `/fe-dev:feat-design [name] update` | 评审反馈后迭代设计文档 |
| `/fe-dev:feat-design [name] check` | 设计文档质量自检 |
| `/fe-dev:feat-gen [name]` | 生成开发计划 + 测试计划 |
| `/fe-dev:feat-gen [name] plan` | 只生成开发计划 |
| `/fe-dev:feat-gen [name] test` | 只生成测试计划 |
| `/fe-dev:feat-exec [name]` | 按计划自动执行开发任务 |
| `/fe-dev:feat-update [变更内容]` | 需求变更管理 |
| `/fe-dev:feat-done <name>` | 标记功能完成 |
| `/fe-dev:feat-archive <name>` | 归档已完成的功能 |

### 代码审查与提交

| 命令 | 说明 |
|------|------|
| `/fe-dev:code-review` | 代码审查（行级 diff，ast-lint + 语义） |
| `/fe-dev:arch-audit` | AI 代码体检（6 维度 LLM 反模式 + 自演化知识库），输出到 `docs/audits/` |
| `/fe-dev:commit` | 代码审查 + 提交（`--push` 可推送） |
| `/fe-dev:gitee-pr` | 通过浏览器自动创建 Gitee PR |

### UI 设计稿

| 命令 | 说明 |
|------|------|
| `/fe-dev:ui-setup` | 配置 MasterGo API 访问凭证（PAT） |
| `/fe-dev:ui-add <url> <name>` | 分析 MasterGo 设计稿，生成设计规格 |
| `/fe-dev:ui-gen [page-id]` | 基于设计规格生成 Vue 页面代码 |
| `/fe-dev:ui` | 查看设计稿转换状态 |
| `/fe-dev:ui-update [page-id]` | 设计稿差异更新 |
| `/fe-dev:ui-check [page-id]` | 生成代码质量检查 |

### Spec Kit

| 命令 | 说明 |
|------|------|
| `/fe-dev:spec-api-sync` | 从 OpenAPI 规范生成 TypeScript 类型和 Service |
| `/fe-dev:spec-design [branchKey]` | 基于需求 + OpenAPI 生成前端详细设计（自动预填 4.2 后端对接接口） |
| `/fe-dev:spec-design [branchKey] update` | 评审反馈后迭代设计文档 |
| `/fe-dev:spec-design [branchKey] check` | 设计文档质量自检（含 OpenAPI 一致性） |
| `/fe-dev:spec-req-gen` | 分析需求文档，生成需求分析和执行计划 |
| `/fe-dev:spec-req-exec` | 按需求计划逐任务执行开发（支持断点续传） |

## 项目模板

### Element Plus Stack

- Nuxt 4 + Vue 3 + TypeScript
- Element Plus (UI)
- Tailwind CSS + SCSS
- Pinia (状态管理)
- WangEditor (富文本)

详见：references/element-setup.md

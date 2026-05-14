# fe-dev

前端开发助手，用于项目初始化和开发工作流管理。

## 安装

```bash
/plugin marketplace add twoer/skills
/plugin install fe-dev@skills
```

## 更新

```bash
/plugin update fe-dev
```

## 使用方式

### 项目初始化

| 命令 | 说明 |
|------|------|
| `/fe-dev:index` | 查看所有可用命令 |
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
| `/fe-dev:feat-req add <url> [alias]` | 添加需求链接到当前 feat |
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

### UI 设计稿

| 命令 | 说明 |
|------|------|
| `/fe-dev:ui-setup` | 配置 MasterGo API 访问凭证（PAT） |
| `/fe-dev:ui-add <url> <name>` | 分析 MasterGo 设计稿，获取 DSL 并输出分析笔记 |
| `/fe-dev:ui-gen [page-id]` | 从已有 DSL 数据重新生成 Vue 页面代码 |
| `/fe-dev:ui` | 查看设计稿转换状态 |
| `/fe-dev:ui-update [page-id]` | 设计稿差异更新 |
| `/fe-dev:ui-check [page-id]` | 生成代码质量检查 |

### 代码审查与提交

| 命令 | 说明 |
|------|------|
| `/fe-dev:code-review` | 代码审查（ast-lint 静态分析 + 语义审查），行级 diff 视角 |
| `/fe-dev:code-review --staged` | 仅审查已暂存的变更 |
| `/fe-dev:code-review <file>` | 审查指定文件 |
| `/fe-dev:arch-audit` | 架构审计（6 维度宏观体检），输出报告到 `docs/audits/` |
| `/fe-dev:commit` | 代码审查 + 提交（加 `--push` 可推送） |
| `/fe-dev:gitee-pr` | 通过浏览器自动创建 Gitee PR（code.iflytek.com） |
| `/fe-dev:gitee-pr <branch>` | 指定目标分支（默认 dev） |

### Spec Kit

| 命令 | 说明 |
|------|------|
| `/fe-dev:spec-api-sync` | 从 OpenAPI 规范生成 TypeScript 类型和 Service |
| `/fe-dev:spec-design [branchKey]` | 基于需求 + OpenAPI 生成前端详细设计（自动预填 4.2 后端对接接口） |
| `/fe-dev:spec-design [branchKey] update` | 评审反馈后迭代设计文档 |
| `/fe-dev:spec-design [branchKey] check` | 设计文档质量自检（含 OpenAPI 一致性） |
| `/fe-dev:spec-req-gen` | 分析需求文档，生成需求分析和执行计划 |
| `/fe-dev:spec-req-exec` | 按需求计划逐任务执行开发（支持断点续传） |

## 依赖

### MasterGo API（UI 命令必需）

**影响命令**: `/fe-dev:ui-add`、`/fe-dev:ui-update`、`/fe-dev:ui-gen`

使用前需配置 MasterGo Personal Access Token，支持从 MasterGo 设计稿自动提取设计信息和下载图片资源。

```bash
/fe-dev:ui-setup
```

按提示输入 PAT（格式 `mg_...`，在 MasterGo 平台「个人设置 → API 管理」中创建）和服务地址。

> **私有化部署**：如果 MasterGo 是私有化部署，在 ui-setup 时输入对应地址（如 `https://mastergo.yourcompany.com`）。

## 可选依赖

fe-dev 核心功能无需额外依赖。以下依赖仅在特定命令中使用，未安装时对应功能会降级或跳过。

### superpowers（可选）

**影响命令**: `/fe-dev:feat-gen`、`/fe-dev:spec-req-gen`

安装 superpowers 后，`feat-gen` 会使用 `superpowers:brainstorming` + `superpowers:writing-plans` 生成更高质量的开发计划。未安装时自动回退到内置的简化流程。

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

### ast-lint-mcp（推荐）

**影响命令**: `/fe-dev:code-review`、`/fe-dev:commit`

安装后，代码审查会先执行 37 条 AST 静态分析规则（安全、可维护性、性能、可访问性、Vue 框架），再进行 Claude 语义审查。未安装时仅执行语义审查。

```bash
npm install -g ast-lint-mcp
```

在 `~/.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "ast-lint": {
      "command": "ast-lint-mcp"
    }
  }
}
```

详见: https://www.npmjs.com/package/ast-lint-mcp

### chrome-devtools MCP（gitee-pr 必需）

**影响命令**: `/fe-dev:gitee-pr`

通过 Chrome DevTools Protocol 连接浏览器，实现自动化创建 PR。

**GitHub**: https://github.com/ChromeDevTools/chrome-devtools-mcp

**Step 1: 在 `~/.claude.json` 中添加 MCP 配置**

推荐使用 Chrome（`--autoConnect` 可直接连接已运行的浏览器，无需重启）：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--autoConnect"]
    }
  }
}
```

**Step 2: 在 Chrome 中开启远程调试**

地址栏输入 `chrome://inspect/#remote-debugging`，在弹出的对话框中点击允许。

**Step 3: 确保浏览器已登录 code.iflytek.com**

> **为什么推荐 Chrome？** `--autoConnect` 依赖 Chrome 144+ 的 `DevToolsActivePort` 机制，可直接连接已运行的浏览器实例，保留登录态，无需命令行重启。Edge 不支持此机制，需要关闭后通过 `--remote-debugging-port=9222` 重启，体验较差。
>
> <details>
> <summary>Edge 用户配置（需命令行启动浏览器）</summary>
>
> ```json
> {
>   "mcpServers": {
>     "chrome-devtools": {
>       "command": "npx",
>       "args": ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
>     }
>   }
> }
> ```
>
> 使用前需关闭所有 Edge 窗口，然后命令行启动：
> ```bash
> /Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --remote-debugging-port=9222
> ```
> </details>

### feishu-to-md-mcp（可选）

**影响命令**: `/fe-dev:feat-req sync`

安装后支持从飞书文档自动同步需求内容到本地。未安装时需要手动将需求文档放入 `requirements/` 目录。

```bash
npm install -g feishu-to-md-mcp
```

在 `~/.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "feishu-to-md": {
      "command": "feishu-to-md-mcp"
    }
  }
}
```

## 功能特性

- 智能检测当前目录是否有前端项目
- 交互式初始化 Nuxt4 + Element Plus 项目
- 选择项目类型（普通项目 / 中台项目）
- 可选关联远程 Git 仓库
- 自动生成研发规范配置（ESLint、Prettier、Stylelint）
- 内置 useHttp composable 和示例 service
- Feature 工作流管理（需求同步、开发计划、测试记录）
- UI 设计稿转代码（MasterGo DSL → Vue 页面）
- 需求文档分析与执行计划生成（Superpowers 集成）
- OpenAPI 规范同步生成 TypeScript 类型和 Service

## 项目文件创建清单

以下命令会在**用户项目目录**中创建或修改文件，按影响范围分类：

### 项目骨架（大量文件）

| 命令 | 创建路径 | 说明 |
|------|---------|------|
| `/fe-dev:init` | 项目根目录 | 完整项目骨架：`package.json`、`nuxt.config.ts`、`app/`、`server/`、`.vscode/`、`.husky/`、ESLint/Prettier/Stylelint 配置等 |

### 项目配置（少量文件）

| 命令 | 创建路径 | 说明 |
|------|---------|------|
| `/fe-dev:claude-init` | `CLAUDE.md` | 项目开发规范和约定 |

### 功能文档（`docs/features/`）

| 命令 | 创建路径 | 说明 |
|------|---------|------|
| `/fe-dev:feat-new` | `docs/features/feat-{name}/` | `index.md`、`dev/plan.md`、`dev/exec.md`、`dev/test.md`、`dev/review.md`、`requirements/links.md` |
| `/fe-dev:feat-req add/sync` | `docs/features/feat-{name}/requirements/` | `links.md`、`product-doc-v{n}.md`（同步后的需求文档）、`product-doc-diff-v{旧}-v{新}.md` |
| `/fe-dev:feat-update` | `docs/features/feat-{name}/` | `requirements/extra.md`、`dev/plan.md`（追加任务）、`dev/change-{date}.md` |
| `/fe-dev:feat-design` | `docs/features/feat-{name}/design/` | `design.md`（前端详细设计，服务评审 + AI 执行参考） |
| `/fe-dev:feat-gen` | `docs/features/feat-{name}/` | `requirements/checklist.md`、`dev/plan.md`、`dev/test.md` |
| `/fe-dev:spec-design` | `apps/frontend/docs/{branchKey}/` | `design.md`（前端详细设计，4.2 章节由 OpenAPI 预填） |
| `/fe-dev:spec-req-gen` | `apps/frontend/docs/{branchKey}/` | `requirements.md`、`plan.md` |
| `/fe-dev:spec-req-exec` | `apps/frontend/docs/{branchKey}/` | `plan.md`（更新状态）、`exec.md`、业务代码文件 |

### 业务代码（源码目录）

| 命令 | 创建路径 | 说明 |
|------|---------|------|
| `/fe-dev:ui-gen` | `{target}` 指定的 `.vue` 文件 | 生成的 Vue 页面 + 可能的子组件 |
| `/fe-dev:ui-update` | `{target}` 指定的 `.vue` 文件 | 根据差异重新生成/更新 |
| `/fe-dev:ui-check` | `{target}` 指定的 `.vue` 文件 | 自动修复 warning 级别问题 |
| `/fe-dev:spec-api-sync` | `app/types/`、`app/composables/` | TypeScript 类型定义和 Service 文件 |
| `/fe-dev:feat-exec` | 计划中涉及的代码文件 | 按任务步骤生成的实际业务代码 |

### 审计报告（`docs/audits/`）

| 命令 | 创建路径 | 说明 |
|------|---------|------|
| `/fe-dev:arch-audit` | `docs/audits/audit-{YYYY-MM-DD-HHmm}.md` | 架构审计报告，只读分析不改业务代码 |

### 设计数据（`docs/features/feat-{name}/ui/`）

| 命令 | 创建路径 | 说明 |
|------|---------|------|
| `/fe-dev:ui-add` | `ui/ui-pages.json`、`ui/specs/{pageId}-dsl-raw.json`、`ui/specs/{pageId}-analysis.md` | 页面注册表、DSL 原始数据、分析笔记 |
| `/fe-dev:ui-update` | `ui/specs/{pageId}-dsl-raw.json` | 覆盖写入新 DSL 数据 |

### 不创建文件的命令（只读）

`/fe-dev:index`、`/fe-dev:feat-list`、`/fe-dev:feat-show`、`/fe-dev:ui`、`/fe-dev:gitee-pr`（只读分析 + 浏览器操作，不创建本地文件）

## 目录结构

```
fe-dev/
├── .claude-plugin/
│   ├── plugin.json              # 插件配置
│   └── marketplace.json         # Marketplace 列表
├── skills/
│   ├── index/SKILL.md            # 命令索引
│   ├── init/SKILL.md             # 项目初始化
│   ├── claude-init/SKILL.md      # 生成 CLAUDE.md
│   ├── feat-new/SKILL.md         # 创建功能工作流
│   ├── feat-list/SKILL.md        # 列出功能
│   ├── feat-show/SKILL.md        # 查看功能详情
│   ├── feat-log/SKILL.md         # 记录开发日志
│   ├── feat-done/SKILL.md        # 标记功能完成
│   ├── feat-archive/SKILL.md     # 归档功能
│   ├── feat-req/SKILL.md         # 需求文档管理（依赖 feishu-to-md-mcp）
│   ├── feat-design/SKILL.md      # 前端详细设计文档（可选，依赖 superpowers）
│   ├── feat-gen/SKILL.md         # 生成开发/测试计划（依赖 superpowers）
│   ├── feat-exec/SKILL.md        # 执行开发任务
│   ├── feat-update/SKILL.md      # 需求变更管理
│   ├── spec-api-sync/SKILL.md    # OpenAPI 规范同步
│   ├── spec-design/SKILL.md      # 前端详细设计文档（OpenAPI 预填 4.2，依赖 superpowers）
│   ├── spec-req-gen/SKILL.md     # 需求分析与执行计划生成
│   ├── spec-req-exec/SKILL.md    # 按需求计划执行开发
│   ├── ui/SKILL.md               # 设计稿列表
│   ├── ui-setup/SKILL.md         # MasterGo API 配置
│   ├── ui-add/SKILL.md           # 设计稿分析
│   ├── ui-gen/SKILL.md           # 从 DSL 重新生成代码
│   ├── ui-update/SKILL.md        # 设计稿更新
│   ├── ui-check/SKILL.md         # 质量检查
│   ├── code-review/SKILL.md      # 代码审查（ast-lint + 语义审查）
│   ├── arch-audit/SKILL.md       # 架构审计（6 维度宏观体检）
│   ├── commit/SKILL.md           # 审查 + 提交（--push 可推送）
│   └── gitee-pr/                 # Gitee PR 创建
│       ├── SKILL.md
│       └── references/pr-template.md  # 内置 PR 描述模板
├── scripts/
│   ├── init-nuxt4-element.sh
│   └── dsl-parser.py
├── config/
│   └── mastergo.json.example     # MasterGo PAT 配置模板
├── templates/
│   ├── feat-index.md
│   ├── feat-plan.md
│   ├── feat-exec.md
│   ├── feat-test.md
│   ├── feat-review.md
│   ├── feat-links.md
│   ├── ui-pages.json
│   └── analysis-template.md
├── docs/
│   ├── spec-kit-analysis.md
│   └── spec-kit-adaptation.md
└── references/
    ├── element-setup.md
    ├── feat-utils.md
    ├── ui-utils.md
    ├── code-review-rules.md      # 代码审查规则（Vue 3 + Nuxt 4）
    └── arch-audit-checklist.md   # 架构审计 6 维度规则
```

## 项目模板

### Element Plus Stack

- Nuxt 4 + Vue 3 + TypeScript
- Element Plus (UI)
- Tailwind CSS + SCSS
- Pinia (状态管理)
- WangEditor (富文本)

## License

MIT

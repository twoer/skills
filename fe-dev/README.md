# fe-dev

前端开发助手，用于项目初始化和开发工作流管理。

## 安装

```bash
/plugin marketplace add twoer/skills
/plugin install fe-dev@skills
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

## 可选依赖

fe-dev 核心功能无需额外依赖。以下两个依赖仅在特定命令中使用，未安装时对应功能会降级或跳过。

### superpowers（可选）

**影响命令**: `/fe-dev:feat-gen`

安装 superpowers 后，`feat-gen` 会使用 `superpowers:brainstorming` + `superpowers:writing-plans` 生成更高质量的开发计划。未安装时自动回退到内置的简化流程。

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

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
- OpenAPI 规范同步生成 TypeScript 类型和 Service

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
│   ├── feat-gen/SKILL.md         # 生成开发/测试计划（依赖 superpowers）
│   ├── feat-exec/SKILL.md        # 执行开发任务
│   ├── feat-update/SKILL.md      # 需求变更管理
│   └── spec/SKILL.md             # 规范工具集（api-sync 等）
├── scripts/
│   └── init-nuxt4-element.sh
├── templates/
│   ├── feat-index.md
│   ├── feat-plan.md
│   ├── feat-exec.md
│   ├── feat-test.md
│   ├── feat-review.md
│   └── feat-links.md
├── docs/
│   ├── spec-kit-analysis.md
│   └── spec-kit-adaptation.md
└── references/
    ├── element-setup.md
    └── feat-utils.md
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

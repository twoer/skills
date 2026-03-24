# fe-dev Skill

前端开发助手，用于项目初始化和开发工作流管理。

## 功能

- 智能检测当前目录是否有前端项目
- 交互式初始化 Nuxt4 + Element Plus 项目
- 选择项目类型（普通项目 / 中台项目）
- 可选关联远程 Git 仓库
- 自动生成研发规范配置（ESLint、Prettier、Stylelint）
- 内置 useHttp composable 和示例 service
- Feature 工作流管理（需求同步、开发计划、测试记录）
- UI 设计稿转代码（MasterGo → design-spec → Vue 页面）
- OpenAPI 规范同步生成 TypeScript 类型和 Service

## 文件结构

```
fe-dev/
├── .claude-plugin/
│   └── plugin.json              # 插件配置（声明 name: fe-dev）
├── skills/                       # 所有子 skill
│   ├── index/SKILL.md            # /fe-dev:index — 命令索引
│   ├── init/SKILL.md             # /fe-dev:init — 项目初始化
│   ├── claude-init/SKILL.md      # /fe-dev:claude-init — 生成 CLAUDE.md
│   ├── feat-new/SKILL.md         # /fe-dev:feat-new — 创建功能工作流
│   ├── feat-list/SKILL.md        # /fe-dev:feat-list — 列出功能
│   ├── feat-show/SKILL.md        # /fe-dev:feat-show — 查看功能详情
│   ├── feat-log/SKILL.md         # /fe-dev:feat-log — 记录开发日志
│   ├── feat-done/SKILL.md        # /fe-dev:feat-done — 标记功能完成
│   ├── feat-archive/SKILL.md     # /fe-dev:feat-archive — 归档功能
│   ├── feat-req/SKILL.md         # /fe-dev:feat-req — 需求文档管理
│   ├── feat-gen/SKILL.md         # /fe-dev:feat-gen — 生成开发/测试计划
│   ├── feat-exec/SKILL.md        # /fe-dev:feat-exec — 执行开发任务
│   ├── feat-update/SKILL.md      # /fe-dev:feat-update — 需求变更管理
│   ├── spec/SKILL.md             # /fe-dev:spec — OpenAPI 同步 + 需求分析(req-gen) + 需求执行(req-exec)
│   ├── ui/SKILL.md               # /fe-dev:ui — 设计稿列表
│   ├── ui-add/SKILL.md           # /fe-dev:ui-add — 设计稿分析
│   ├── ui-gen/SKILL.md           # /fe-dev:ui-gen — 代码生成
│   ├── ui-update/SKILL.md        # /fe-dev:ui-update — 设计稿更新
│   └── ui-check/SKILL.md         # /fe-dev:ui-check — 质量检查
├── scripts/
│   └── init-nuxt4-element.sh     # Element Plus 初始化脚本
├── templates/                    # feat-new 和 ui 使用的模板
├── docs/                         # 分析和适配文档
└── references/
    ├── element-setup.md           # Element Plus 配置参考
    ├── feat-utils.md             # Feature 共享工具
    └── ui-utils.md               # UI Skill 共享工具
```

## 使用方式

```bash
# 查看所有可用命令
/fe-dev:index

# 初始化项目
/fe-dev:init

# 创建功能开发工作流
/fe-dev:feat-new

# 同步需求文档
/fe-dev:feat-req sync

# 生成开发计划
/fe-dev:feat-gen

# 执行开发任务
/fe-dev:feat-exec

# 同步 OpenAPI 规范
/fe-dev:spec api-sync
```

## 初始化流程

1. 检测项目状态
2. 选择项目类型（普通/中台）
3. 是否关联远程仓库
4. 执行初始化脚本
5. 生成 CLAUDE.md

## 项目类型

### 普通项目
- 默认布局（页头 + 页脚）
- 首页
- 关于页

### 中台项目
- 登录页面
- 管理端布局（左侧菜单 + 顶部导航）
- 仪表盘
- 用户管理（CRUD 示例）
- 系统设置

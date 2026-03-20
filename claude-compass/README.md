# claude-compass

> 团队共享规则管理 Skill —— 规则写一份，全团队所有项目共享。

## 解决什么问题

用 Claude Code 写代码时，它会读 `.claude/rules/` 下的规则来约束自己的行为。问题是：

- 每个项目都要手动写一遍相同的规则
- 团队成员之间规则不统一，Claude 在不同项目表现不一致
- 规则更新后要逐项目手动同步

claude-compass 用**符号链接**把一份共享规则映射到所有项目，更新一处，全部生效。

## 原理

```
~/.claude/skills/claude-compass/rules/   ← 团队共享规则（唯一真实来源）
        ↓ symlink
项目A/.claude/rules/shared/              ← Claude Code 自动读取
项目B/.claude/rules/shared/              ← Claude Code 自动读取
项目C/.claude/rules/shared/              ← Claude Code 自动读取
```

Claude Code 启动时会递归扫描 `.claude/rules/` 目录下所有 `.md` 文件（支持 symlink），无需手动引用。

## 使用场景

| 场景 | 命令 | 说明 |
|------|------|------|
| 新项目接入团队规范 | `/claude-compass:init` → `/claude-compass:claude-init` | 链接规则 + 生成 CLAUDE.md |
| 团队规则更新了 | `/claude-compass:sync` | 检查链接、验证规则完整性 |
| 想加一条团队规范 | `/claude-compass:create` | 交互式创建，写入共享规则目录 |
| Claude 没遵守规范 | `/claude-compass:check` | 诊断规则配置是否正常 |

## 安装

```bash
/plugin marketplace add twoer/skills
/plugin install claude-compass@skills
```

## 更新

```bash
/plugin update claude-compass
```

## 快速开始

```bash
# 1. 在业务项目中链接规则
/claude-compass:init

# 2. 生成 CLAUDE.md
/claude-compass:claude-init

# 完成！之后 Claude Code 会自动加载团队规则
```

## 规则层级

项目可以有自己的规则，跟团队规则分层共存，越具体优先级越高：

```
.claude/rules/shared/        ← 团队规则（compass 管理，不手动改）
.claude/rules/shared/.disabled ← 禁用列表（可选，按项目禁用某些共享规则）
.claude/rules/project/       ← 项目特有规则（提交到 Git）
CLAUDE.md                    ← 项目级配置（提交到 Git）
CLAUDE.local.md              ← 个人偏好（gitignore，不提交）
```

如果团队规则说"用 BEM"，但某个项目决定不用，可以：
- 在 `CLAUDE.md` 里覆盖
- 或在 `.claude/rules/shared/.disabled` 中禁用该规则文件

## 与 fe-dev 的关系

- **claude-compass**：团队规则管理（低频，配一次偶尔同步）
- **fe-dev**：前端开发工作流（高频，日常 Feature / UI / Spec）

`fe-dev:init` 初始化项目后，引导调用 compass 的 `/claude-compass:init` + `/claude-compass:claude-init` 完成规则配置。两者配合，不重叠。

## 命令一览

| 命令 | 说明 |
|------|------|
| `/claude-compass:init` | 为项目链接团队共享规则 |
| `/claude-compass:claude-init` | 生成 CLAUDE.md |
| `/claude-compass:sync` | 同步最新团队规则 |
| `/claude-compass:create` | 创建新的共享规则 |
| `/claude-compass:check` | 检查规则健康状态 |

## 目录结构

```
claude-compass/
├── SKILL.md                   # 主入口（路由）
├── skills/
│   ├── init/SKILL.md          # 规则链接
│   ├── claude-init/SKILL.md   # 生成 CLAUDE.md
│   ├── sync/SKILL.md          # 规则同步
│   ├── create/SKILL.md        # 规则创建
│   └── check/SKILL.md         # 健康检查
├── rules/                     # 团队共享规则
│   ├── code-style.md
│   ├── security.md
│   ├── git-conventions.md
│   └── frontend/
│       ├── vue-conventions.md
│       ├── css-standards.md
│       └── typescript.md
├── templates/                 # CLAUDE.md 模板
│   ├── _base.md
│   ├── vue3-ts.md
│   └── nuxt4-vue3-ts.md
└── scripts/
    └── session-check.sh       # SessionStart Hook
```

## 日常维护

- **新规则**：任何成员 `/claude-compass:create` → 提交到共享仓库 → 团队自动生效
- **规则更新**：`npx skills update` 或 `/claude-compass:sync`
- **新项目**：`/claude-compass:init` → `/claude-compass:claude-init`

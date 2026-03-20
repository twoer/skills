# Feat 共享工具

所有 `fe-dev:feat:*` skill 共用的工具函数和约定。

---

## 共享命令

### requireGitRepo

检查是否在 Git 仓库中，否则报错退出。

```bash
git rev-parse --is-inside-work-tree
```

- 输出 `true` → 继续
- 报错 → 提示用户先初始化 Git 仓库，退出

### getFeatName

从当前 Git 分支获取 feat 名称。

```bash
git branch --show-current
```

- 输出以 `feat/` 开头 → 去除前缀，取后面部分作为 `featName`
- 不以 `feat/` 开头 → 提示用户切换到功能分支或手动指定 feat 名称

### getFeatDir

构造 feat 目录路径。

```bash
docs/features/feat-{featName}
```

### requireFeatDir

检查 feat 目录是否存在。

```bash
ls docs/features/feat-{featName}/index.md
```

- 存在 → 继续
- 不存在 → 提示用户先运行 `/fe-dev:feat-new`

---

## 命名规范

- 功能名称：kebab-case，自动转换中文（如 "用户管理" → `user-management`）
- Git 分支：`feat/{name}`
- 目录：`docs/features/feat-{name}/`
- 文件：`feat-{name}/index.md`、`feat-{name}/dev/plan.md` 等

## 目录结构

```
docs/features/feat-{name}/
├── index.md              # 功能元信息
├── requirements/         # 原始需求
│   ├── links.md
│   ├── extra.md
│   └── checklist.md
└── dev/                  # 开发文档
    ├── plan.md           # 开发计划
    ├── exec.md           # 执行日志
    ├── test.md           # 测试记录
    └── review.md         # 代码审查
```

## 状态枚举

```typescript
type FeatStatus =
  | "🚧 开发中"
  | "🧪 测试中"
  | "👀 审查中"
  | "✅ 已完成"
  | "📦 已归档"
  | "❌ 已废弃"
```

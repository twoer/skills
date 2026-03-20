# Feat 共享约定

所有 `fe-dev:feat:*` skill 共享的约定和工具函数。

---

## 共享约定

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

UI 目录结构（`ui/` 位于 feat 目录内）：

```
docs/features/feat-{name}/
└── ui/                      # UI 设计稿转换
    ├── ui-pages.json        # 页面注册表
    └── specs/               # 设计规格文档
        ├── {pageId}-dsl-raw.json    # 原始 DSL 数据
        └── {pageId}-analysis.md     # 分析笔记
```

## 状态枚举

```typescript
type FeatStatus =
  | "📋 已创建"       // feat-new 完成
  | "📝 需求采集中"    // feat-req sync 工作中
  | "📐 计划生成中"    // feat-gen 工作中
  | "🚧 开发中"       // feat-exec 工作中
  | "✅ 已完成"       // feat-done 完成
  | "📦 已归档"       // feat-archive 完成
```

状态流转：`已创建 → 需求采集中 → 计划生成中 → 开发中 → 已完成 → 已归档`。每个状态由对应 skill 写入 `index.md`。

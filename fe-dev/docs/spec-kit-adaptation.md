# fe-dev 适配 Spec-Kit 方案

> 分析时间: 2026-03-17
> 背景: 后端主导的 monorepo 项目，已确定使用 Spec-Kit，前后端在同一仓库

## 项目结构参考

```
project/
├── specs/                      # 规范目录（单一真相源）
│   ├── api/                    # OpenAPI 规范
│   ├── features/               # 功能规格
│   └── architecture/           # 架构决策记录
│
├── apps/
│   ├── frontend/               # Vue 3 前端
│   │   ├── src/
│   │   │   ├── api/            # API 客户端
│   │   │   ├── components/     # Vue 组件
│   │   │   ├── views/          # 页面视图
│   │   │   ├── router/         # 路由配置
│   │   │   ├── pinia/          # 状态管理
│   │   │   └── utils/          # 工具函数
│   │   └── tests/unit/         # 单元测试
│   │
│   └── backend/                # Spring Boot 后端
│       └── src/main/java/com.iflytek.overseas_affiliate/
│           ├── modules/        # 业务模块
│           ├── repository/     # 数据访问层
│           ├── dto/            # 数据传输对象
│           ├── common/         # 通用组件
│           ├── exception/      # 异常处理
│           └── config/         # 配置类
│
├── shared/                     # 共享资源
│   ├── types/                  # 生成的类型定义
│   └── scripts/                # 工具脚本
│
├── .github/workflows/          # CI/CD 配置
└── .specify/                   # Spec Kit 配置
```

---

## 核心思路

fe-dev 不硬绑一套流程，检测到 Spec-Kit 时自动适配其工作流规范。fe-dev 从"工作流定义者"变成"工作流适配器"。

### 检测逻辑

```bash
has_speckit = exists(".specify/")
```

`.specify/` 目录是最可靠的标志，比检测单个文件更明确。

---

## 适配后的 feat new 行为对比

| 步骤 | 默认模式（fe-dev） | Spec-Kit 适配模式 |
|------|-------------------|-------------------|
| 创建分支 | `feat/{name}` | `feat/{name}`（不变） |
| 目录结构 | `docs/features/feat-{name}/` | `specs/features/{name}/` |
| 生成文档 | index.md, plan.md, exec.md, test.md, review.md | spec.md, plan.md, tasks.md |
| 需求分析 | superpowers brainstorming | superpowers brainstorming（不变） |
| 后续流程 | feat gen → feat exec → feat done | speckit.plan → speckit.tasks → speckit.implement |

---

## 文档映射

### 默认模式输出

```
docs/features/feat-{name}/
├── index.md              # 功能概览
├── requirements/
│   └── links.md          # 需求链接
└── dev/
    ├── plan.md           # 开发计划 + 任务表
    ├── exec.md           # 执行记录
    ├── test.md           # 测试计划
    └── review.md         # 评审记录
```

### Spec-Kit 适配模式输出

```
specs/features/{name}/
├── spec.md               # 功能规格（前后端共用）
├── plan.md               # 实现方案
├── tasks.md              # 任务拆解
└── research.md           # 技术调研（可选）
```

---

## 适配价值

### 1. 前后端共享同一套 spec 语言

后端写 spec，前端读 spec，不会出现"前端需求文档"和"后端需求文档"两份。

### 2. 前端不用单独学 Spec-Kit

fe-dev 自动按 Spec-Kit 格式生成 spec.md，前端开发者正常使用 `/fe-dev feat new` 即可，无需关心底层格式差异。

### 3. 需求来源统一

一个 spec.md 前后端共用，消除信息不对称。

### 4. 前端开发能力复用

fe-dev 的 superpowers 能力（brainstorming、TDD、code review、parallel agents）不受影响，只是输出格式变了。

---

## 不需要借鉴的部分

| Spec-Kit 概念 | 原因 |
|--------------|------|
| Constitution | CLAUDE.md 已等效，自动加载零成本 |
| Clarify | superpowers brainstorming 已覆盖结构化需求分析 |
| 独立 spec.md 格式 | fe-dev 适配后自动生成，无需用户关心 |
| Greenfield/Brownfield 阶段 | 项目场景固定，不需要 |

---

## 实现要点

### 1. project-checker.md 增加检测

在技术栈检测部分增加 Spec-Kit 检测：

```bash
has_speckit = exists(".specify/")
```

### 2. feat-new.md 分支逻辑

步骤 5（创建目录结构）和步骤 6（生成文档）根据检测结果走不同路径：

```
if has_speckit:
    mkdir -p specs/features/{name}
    生成 spec.md, plan.md, tasks.md
else:
    mkdir -p docs/features/feat-{name}/dev
    mkdir -p docs/features/feat-{name}/requirements
    生成 index.md, plan.md, exec.md, test.md, review.md
```

### 3. 模板文件

需要新增 Spec-Kit 格式的模板：

| 模板文件 | 输出路径 |
|----------|----------|
| speckit-spec.md | `specs/features/{name}/spec.md` |
| speckit-plan.md | `specs/features/{name}/plan.md` |
| speckit-tasks.md | `specs/features/{name}/tasks.md` |

### 4. feat-gen / feat-exec 适配

- Spec-Kit 模式下，`feat gen` 生成的任务表按 tasks.md 格式（支持 `[P]` 并行标记和依赖列）
- `feat exec` 解析 tasks.md 的任务表，而非 plan.md

---

## 待确认事项

- [ ] 前端框架是 Vue 3（非 Nuxt 4），`init` 命令暂不适用，`feat` 工作流本身不受影响
- [ ] Spec-Kit 的 spec.md 具体格式需要参考后端的实际使用情况
- [ ] 是否需要在 `feat new` 时询问用户选择"默认模式"还是"Spec-Kit 模式"，还是自动检测
- [ ] tasks.md 的并行标记 `[P]` 和依赖关系格式是否与后端约定一致

---
name: spec-api-sync
description: 从 OpenAPI 规范生成 TypeScript 类型和 Service。触发词: "api-sync", "API 同步", "生成接口", "OpenAPI", "规范同步"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Spec API Sync - OpenAPI 规范同步

从 OpenAPI 规范生成 TypeScript 类型和 useXxxService 文件。

## 执行流程

### 步骤 1: 获取分支名和 git 根目录

```bash
git branch --show-current
git rev-parse --show-toplevel
```

`feat/xxx` → `xxx` 作为 branchKey；非 feat 分支 → 完整分支名。

### 步骤 2: 定位 openapi.yaml

以 `{GIT_ROOT}` 作为根目录，按优先级搜索：

1. `{GIT_ROOT}/specs/{branchKey}/contracts/openapi.yaml`
2. `{GIT_ROOT}/specs/{branchKey}/artifacts/contracts/openapi.yaml`
3. Glob 搜索 `{GIT_ROOT}/specs/{branchKey}/**/openapi.yaml`
4. Glob 搜索 `{GIT_ROOT}/specs/**/openapi.yaml`，让用户选择

> **说明**：用户通常在前端子目录下运行命令，而 `specs/` 目录可能位于 monorepo 根目录，因此必须从 git 根目录搜索，而非当前工作目录。

### 步骤 3: 解析 OpenAPI

提取 info、paths、components/schemas、tags。处理 `$ref` 引用。

### 步骤 4: 分析路径结构，确定模块拆分方案

**核心原则：基于 paths 路径层级拆分模块，而非基于 tags。**

- 无子模块：`app/types/auth.ts` + `app/composables/useAuthService.ts`
- 有子模块：`app/types/reports/cps.ts` + `app/composables/reports/useCpsReportService.ts`

AskUserQuestion 让用户确认方案。

### 步骤 5: 检查输出文件与残留文件

已有文件 → 追加 / 覆盖 / 跳过。残留文件 → 删除 / 保留。

### 步骤 6: 确保基础类型

读取 `useHttp` composable，检查 `app/types/api.ts` 是否存在，确保基础类型就绪。

### 步骤 7: 生成 TypeScript 类型

命名约定：`{Name}Model`（schema）、`{Name}FormModel`（请求体）、`SearchFormModel`（查询参数）。

不生成外层 ApiResponse 包装，枚举转 type，可选字段标记 `?:`。

### 步骤 8: 生成 Service 文件

每个端点一个方法，去除 `/api` 前缀。特殊处理：blob 下载、FormData、分页。

### 步骤 9: 更新导出

检查 `app/types/index.ts`，添加新生成的类型。

### 步骤 10: 类型检查

```bash
npx vue-tsc --noEmit
```

### 步骤 11: 输出报告

```
✅ API 规范同步完成
📄 源文件: specs/{branchKey}/contracts/openapi.yaml
📁 生成文件: Types (N types) + Services (N methods)
```

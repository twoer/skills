---
name: feat-req
description: 管理功能关联的需求链接，支持添加、查看、同步需求文档。触发词: "feat req", "需求管理", "需求文档", "同步需求"
allowed-tools: Read, Grep, Glob, Bash
---

# Feat Req - 需求文档管理

> 共享工具: `<skill-path>/references/feat-utils.md`

## 前置步骤：获取当前 feat 名称

```bash
git branch --show-current   # 输出如 feat/login-page
```

不以 `feat/` 开头则提示用户切换到功能分支。

## `/fe-dev:feat-req` - 查看需求链接

读取 `docs/features/feat-{name}/requirements/links.md`，格式化输出表格。

## `/fe-dev:feat-req add <url> [alias]` - 添加需求链接

1. 解析参数
2. 检查/创建 links.md（不存在则从 `<skill-path>/templates/feat-links.md` 创建）
3. 去重检查
4. 插入新行

## `/fe-dev:feat-req sync` - 同步所有需求文档

遍历 links.md 中所有链接，调用 `mcp__feishu_to_md__convert_feishu_doc` 转换文档。

版本管理：无历史 → v1.0.0；有变化 → patch +1，生成 diff 文件。

## `/fe-dev:feat-req sync <alias>` - 同步指定文档

同上，但只处理指定 alias。

## 目录结构

```
docs/features/feat-{name}/requirements/
├── links.md
├── product-doc-v1.0.0.md
├── product-doc-v1.0.1.md
└── product-doc-diff-v1.0.0-v1.0.1.md
```

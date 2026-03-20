---
name: feat-req
description: 管理功能关联的需求链接，支持添加、查看、同步需求文档。触发词: "feat req", "需求管理", "需求文档", "同步需求"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Feat Req - 需求文档管理

> 共享约定: `<skill-path>/references/feat-utils.md`

## 前置步骤：获取当前 feat 名称 + 更新状态

```bash
git branch --show-current   # 输出如 feat/login-page
```

不以 `feat/` 开头则提示用户切换到功能分支。

将 `index.md` 状态更新为 `📝 需求采集中`（当前为 `📋 已创建` 时）。

## `/fe-dev:feat-req` - 查看需求链接

读取 `docs/features/feat-{name}/requirements/links.md`，格式化输出表格。

## `/fe-dev:feat-req add <url> [alias]` - 添加需求链接

1. 解析参数
2. 检查/创建 links.md（不存在则从 `<skill-path>/templates/feat-links.md` 创建）
3. 去重检查
4. 插入新行

## `/fe-dev:feat-req sync` - 同步所有需求文档

**前置检测**：检测 `mcp__feishu_to_md__convert_feishu_doc` 工具是否可用。不可用时通过 AskUserQuestion 提示：

```
feishu-to-md MCP 未安装，需求同步功能依赖此工具将飞书文档转为 Markdown。

安装方式：
  npm install -g feishu-to-md-mcp

然后在 ~/.claude/settings.json 的 mcpServers 中添加：
  {"feishu-to-md": {"command": "feishu-to-md-mcp"}}

详见：https://www.npmjs.com/package/feishu-to-md-mcp
```

提示后终止执行，等待用户配置完成后重新运行。

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

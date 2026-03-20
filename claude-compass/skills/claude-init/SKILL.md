---
name: claude-init
description: 为当前项目生成 CLAUDE.md 文件。分析技术栈，选择模板，结合共享规则生成。
trigger: |
  当用户说"生成 CLAUDE.md"、"创建 CLAUDE.md"、"claude init"时触发。
type: rigid
---

# Claude Init - 生成 CLAUDE.md

分析项目结构和技术栈，基于共享规则和模板生成 CLAUDE.md。

> **前置条件**：建议先执行 `/claude-compass:init` 链接共享规则，再执行本命令。

## Checklist

- [ ] **检测技术栈**：读取项目文件判断技术栈
- [ ] **选择模板**：根据技术栈选择对应模板
- [ ] **生成目录树**：分析项目结构
- [ ] **写入 CLAUDE.md**：填充模板并写入
- [ ] **生成 CLAUDE.local.md**：创建个人配置，加入 .gitignore
- [ ] **输出摘要**

## Step 1: 检测技术栈

读取项目文件判断（按优先级，首个匹配即命中）：

| 优先级 | 条件 | 判断结果 |
|--------|------|---------|
| 1 | package.json 含 nuxt | Nuxt 项目 → 模板 `nuxt4-vue3-ts.md` |
| 2 | package.json 含 vue（无 nuxt）| Vue 项目 → 模板 `vue3-ts.md` |
| 3 | package.json 含 react | React 项目 → 模板 `_base.md` |
| 4 | package.json 含 express/koa/fastify/nest | Node.js 后端 → 模板 `_base.md` |
| 5 | 根目录存在 pnpm-workspace.yaml 或 lerna.json | Monorepo → 模板 `_base.md` |
| 6 | 以上都不匹配 | 使用 `_base.md` 通用模板 |

如果自动检测结果不符合预期，**询问用户是否手动选择模板**，列出 `<skill-path>/templates/` 下所有可用模板供选择。

模板位置：`<skill-path>/templates/`（即 claude-compass 安装目录下的 templates/）

## Step 2: 选择模板

读取对应模板文件内容，作为 CLAUDE.md 的基础。

## Step 3: 生成目录树

```bash
tree -L 3 -I 'node_modules|.nuxt|dist|.git|.claude' --dirsfirst
```

将结果填入模板的 Project Structure 部分。

## Step 4: 写入 CLAUDE.md

- 替换模板中的占位符（`{项目名称}`、`{日期}`）
- 填充 Project Structure 和 Commands
- **动态填充共享规则列表**：扫描 `.claude/rules/shared/` 下所有 `.md` 文件（含子目录），替换模板中的 `{扫描 .claude/rules/shared/ 下所有 .md 文件并列出}` 占位符，格式为 `- .claude/rules/shared/xxx.md`（每行一条）
- 如果 CLAUDE.md **已存在**，不覆盖，询问用户：覆盖 / 追加 / 取消

## Step 5: 生成 CLAUDE.local.md

```markdown
# 个人本地配置

在此添加你的个人偏好，此文件不会提交到 Git。

## 个人偏好

<!-- 例如：
- 我偏好简洁的输出
- 我是后端开发，前端部分请详细解释
-->
```

确保 `.gitignore` 包含 `CLAUDE.local.md`。

## Step 6: 输出摘要

```
CLAUDE.md 生成完成！

  基于模板：{模板名}
  检测技术栈：{技术栈}

  生成的文件：
    CLAUDE.md          → 项目规范
    CLAUDE.local.md    → 个人配置（已加入 .gitignore）
```

## 其他可用命令

```
  /claude-compass:sync          同步最新团队规则
  /claude-compass:create        创建新的共享规则
  /claude-compass:check         检查规则健康状态
```

## 错误处理

| 错误 | 处理 |
|------|------|
| 无法识别技术栈 | 使用 _base.md 通用模板，提示用户手动补充 |
| CLAUDE.md 已存在 | 询问用户：覆盖 / 追加 / 取消 |
| 共享规则未链接 | 提示先执行 `/claude-compass:init` |

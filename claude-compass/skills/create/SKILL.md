---
name: create
description: 创建新的团队共享规则。交互式收集规则信息，生成标准格式文件。
trigger: |
  当用户说"创建规则"、"添加规范"、"新建团队规则"、
  "create rule"、"add rule"时触发。
type: flexible
---

# Create

创建新的团队共享规则。**Flexible Skill**，根据用户提供的信息灵活适配。

## 交互流程

### 1. 收集信息

向用户询问（如果用户消息中已包含部分信息，跳过对应问题）：

**必填：**
- 规则名称（英文 kebab-case，如 `form-validation`）
- 规则分类：通用 / frontend / backend / devops / 自定义分类
- 规则内容（用户口述即可，由 AI 整理成规范格式）

**可选：**
- 生效路径范围（如 `app/**/*.vue`）
- 正例 / 反例代码

### 2. 生成规则文件

按标准格式生成（单个规则文件 < 50 行）：

```markdown
---
description: {一行描述}
paths:               # 可选
  - "{生效路径}"
---

# {规则标题}

## 要求

- {规则条目 1}
- {规则条目 2}

## 示例

正确：
{正例代码}

错误：
{反例代码}

## 原因

{为什么要这样做}
```

### 3. 确定文件位置

| 分类 | 路径 |
|------|------|
| 通用 | `rules/{name}.md` |
| frontend | `rules/frontend/{name}.md` |
| backend | `rules/backend/{name}.md` |
| devops | `rules/devops/{name}.md` |
| 自定义 | `rules/{category}/{name}.md` |

如果目标子目录不存在，自动创建。

### 4. 写入文件

将文件写入 Skill 包的 rules/ 目录：

```bash
RULES_DIR="$HOME/.claude/skills/claude-compass/rules"
# 写入对应目录
```

### 5. 格式验证

写入后自动检查规则文件格式：

| 检查项 | 要求 | 不通过处理 |
|--------|------|-----------|
| frontmatter 存在 | 必须以 `---` 开头和结尾 | 自动补充空 frontmatter |
| description 字段 | frontmatter 必须包含 `description` | 提示用户补充 |
| 正文行数 | 不超过 50 行（不含 frontmatter） | 警告并建议拆分 |
| 文件名格式 | kebab-case，`.md` 后缀 | 自动修正 |

### 6. 输出结果

```
规则已创建：rules/frontend/{name}.md
格式检查：通过

注意：此规则目前仅存在于本机。
要让团队其他成员获取到，需要将规则提交到共享仓库：
  1. cd ~/.claude/skills/claude-compass
  2. git add rules/frontend/{name}.md
  3. git commit -m "rule: add {name}"
  4. git push
```

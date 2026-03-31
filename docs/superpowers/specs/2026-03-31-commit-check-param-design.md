# Commit Skill `--check` 参数设计

## 背景

repo 插件的 commit skill 当前只支持可选的 commit message 参数。用户希望在提交前增加代码审核能力，通过 `--check` 标志触发。

## 目标

在 `/repo:commit` 和 `/repo:commit-push` 中新增 `--check` 参数，提交前对变更代码做基础审查 + 代码风格检查，发现问题则阻断提交。

## 参数格式

```
/repo:commit                    # 普通提交
/repo:commit --check            # 提交前审核
/repo:commit --check feat: xxx  # 审核 + 指定提交信息
/repo:commit feat: xxx --check  # 顺序不限
```

解析逻辑：从 args 中移除 `--check` 标志，剩余部分作为 commit message。`--check` 可出现在任意位置。

## 流程变更

在现有第 2 步（检查 git 状态）之后、第 3 步（分析变更生成信息）之前，插入审核步骤。

### 新增步骤：代码审核（仅 `--check` 时执行）

1. **获取变更文件列表**

   ```bash
   git diff --name-only
   ```

2. **读取变更文件内容**

   逐个读取变更文件，关注变更行及其上下文。

3. **审核内容**

   - **基础代码审查**：潜在 bug、逻辑错误、未使用变量、明显安全问题（如 XSS、注入等）
   - **代码风格 + 质量**：风格一致性、命名规范、可读性、不必要的复杂度

4. **输出审核报告**

   按文件分组，列出发现的问题：

   ```
   ## 代码审核报告

   ### src/components/Login.vue
   - [error] 第 42 行：`password` 直接拼接进 URL，存在注入风险
   - [warning] 第 78 行：变量 `tempData` 已声明但未使用

   ### src/utils/format.ts
   - [warning] 第 15 行：函数 `parseDate` 命名与已有 `formatDate` 风格不一致
   ```

5. **审核结果判定**

   - 发现任何 **error** 或 **warning** → 阻断提交，输出报告
   - 无问题 → 输出「审核通过」，继续提交流程

## allowed-tools 调整

commit skill 的 `allowed-tools` 新增：

- `Grep`（搜索代码模式辅助审查）

`Read` 和 `Bash(git *)` 已具备，无需额外调整。

## 版本

从 v1.1.0 升级到 v1.2.0（新增功能，向后兼容）。

## 涉及文件

| 文件 | 变更 |
|------|------|
| `repo/skills/commit/SKILL.md` | 新增参数说明、审核步骤、allowed-tools |
| `repo/skills/commit-push/SKILL.md` | 同上 |
| `repo/README.md` | 更新使用说明 |
| `repo/CLAUDE.md` | 无变更 |

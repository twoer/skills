# repo

Git 操作辅助工具集。

## 安装

```bash
/plugin marketplace add twoer/skills
/plugin install repo@skills
```

## 更新

```bash
/plugin update repo
```

## 使用方式

### Commit

| 命令 | 说明 |
|------|------|
| `/repo:commit` | 提交代码到本地仓库（不推送） |
| `/repo:commit <message>` | 使用指定提交信息提交 |
| `/repo:commit --check` | 提交前审核代码，发现问题则阻断提交 |
| `/repo:commit --check <message>` | 审核后提交（指定提交信息） |

```bash
# 自动生成提交信息
/repo:commit

# 指定提交信息
/repo:commit feat: 新增用户管理模块

# 提交前审核代码
/repo:commit --check

# 审核后提交（指定提交信息）
/repo:commit --check feat: 新增用户管理模块
```

### Commit & Push

| 命令 | 说明 |
|------|------|
| `/repo:commit-push` | 提交代码并推送到远程仓库 |
| `/repo:commit-push <message>` | 使用指定提交信息提交并推送 |
| `/repo:commit-push --check` | 提交前审核代码，发现问题则阻断提交 |
| `/repo:commit-push --check <message>` | 审核后提交并推送（指定提交信息） |

```bash
# 自动生成提交信息
/repo:commit-push

# 指定提交信息
/repo:commit-push feat: 新增用户管理模块

# 提交前审核代码
/repo:commit-push --check

# 审核后提交并推送（指定提交信息）
/repo:commit-push --check feat: 新增用户管理模块
```

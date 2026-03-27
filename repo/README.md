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

### Commit & Push

| 命令 | 说明 |
|------|------|
| `/repo:commit-push` | 提交代码并推送到远程仓库 |
| `/repo:commit-push <message>` | 使用指定提交信息提交并推送 |

```bash
# 自动生成提交信息
/repo:commit-push

# 指定提交信息
/repo:commit-push feat: 新增用户管理模块
```

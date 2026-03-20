---
name: feat-log
description: 快速记录开发日志。触发词: "feat log", "开发日志", "记录日志"
---

# Feat Log - 记录开发日志

> 共享工具: `<skill-path>/references/feat-utils.md`

## 执行流程

1. 参数解析：`args[0]` = featName，`args[1]` = message
2. 检查 `docs/features/feat-{name}/dev/exec.md` 是否存在
3. 读取现有 exec.md，检查当天是否已有 `## {日期}` 条目
4. 追加日志：`- [{时间}] {消息}` 到当天条目下，或创建新日期条目
5. 写入文件

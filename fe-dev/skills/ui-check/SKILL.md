---
name: ui-check
description: 生成代码质量检查。触发词: "ui check", "质量检查", "ui-check"
allowed-tools: Read, Grep, Glob, Bash
---

# UI Check - 质量检查

检查生成的 .vue 文件是否符合 UI 规范。

> 共享工具: `<skill-path>/references/ui-utils.md`
> **语言要求**：所有输出统一使用中文，代码和文件路径保持英文。

## 执行流程

### 步骤 1: 获取 feat 名称

```bash
git branch --show-current
```

不以 `feat/` 开头则提示用户切换到功能分支。

### 步骤 2: 确定检查范围

读取 `{UI_DIR}/ui-pages.json`：

- 指定了 `page-id` 参数 → 只检查该页面
- 未指定 → 检查所有 `status=converted` 或 `status=reviewed` 的页面

### 步骤 3: 读取并扫描 .vue 文件

对每个目标文件，读取内容并对照质检规则扫描。

质检规则详见 `<skill-path>/references/ui-utils.md` 中的"质检规则"部分。

### 步骤 4: 输出检查结果

按严重程度排序：

```
🔍 质量检查结果: {pageId}

❌ Error (2):
  - 第 45 行: 发现内联 style="color: red"
  - 第 12 行: <el-input> 缺少 label 或 aria-label

⚠️ Warning (3):
  - 第 30 行: <a> 标签缺少 cursor-pointer class
  - 第 55 行: hover 效果缺少 transition
  - 第 60 行: 文字对比度不足（#999 on #fff = 2.8:1）

ℹ️ Info (1):
  - 建议使用 ElPagination 替代手动分页实现
```

### 步骤 5: 自动修复 Warning

对步骤 4 中检测到的 warning 级别问题，尝试自动修复：

**可自动修复的 warning 类型：**
- 硬编码色值 → 替换为已注册的 design token（如 `#02B3D6` → `var(--el-color-primary)`）
- 缺少 `cursor-pointer` → 为可点击元素添加 `cursor-pointer` class
- 缺少 `transition` → 为 hover 状态添加 `transition: color 200ms`
- 有 `transition` 但无 `hover:` 效果 → 为可点击元素添加 `hover:opacity-80` class（确保 transition 有实际作用目标）
- 缺少 `alt` 属性 → 为 `<img>` 添加 `alt=""`
- flex 容器内文本子项缺少 `min-w-0` → 添加 `min-w-0` class（防止文本溢出容器）
- 宽度约束容器内文本缺少 `break-words` → 添加 `break-words` class（确保文本可换行）

**执行流程：**
1. 逐项修复 warning，输出修复详情
2. 修复完成后重新执行步骤 3-4 检查
3. 如果重新检查后无 error → 进入步骤 6
4. 如果修复引入了新 error → 回退修复，保持 `converted` 状态

### 步骤 6: 更新状态

- 有 error → 状态保持 `converted`，提示用户修复后重新检查
- 无 error（含已自动修复的 warning）→ 状态更新为 `reviewed`

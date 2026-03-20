# Design Spec: {pageId}

## 来源

- MasterGo: {url}
- 提取时间: {date}

## Design Tokens

### Element Plus 主题

| 变量 | 值 | 说明 |
|------|-----|------|
| <!-- 例：--el-color-primary | #02B3D6 | 品牌主色 --> |

### Tailwind 扩展

| 变量 | 值 | 说明 |
|------|-----|------|
| <!-- 例：colors.brand | #02B3D6 | 品牌色 --> |

### Scoped SCSS

| 变量 | 值 | 说明 |
|------|-----|------|
| <!-- 例：--shadow-card | 0px 20px 25px... | 卡片阴影 --> |

## 布局结构

<!-- 描述页面整体布局，如：左右分栏（flex: 1 + 1）、顶部导航 + 内容区、弹窗等 -->

## 组件清单

| 区域 | Element Plus 组件 | Tailwind 样式 | 说明 |
|------|-------------------|--------------|------|
| <!-- 例：搜索栏 | ElInput, ElButton | flex, gap-4 | 关键词 + 状态筛选 --> |

## 字段映射

| 字段名 | 类型 | EP 组件 | 校验规则 | 关联 Type |
|--------|------|---------|---------|-----------|
| <!-- 例：username | string | ElInput | required | LoginFormModel.username --> |

## 交互描述

| 交互 | 触发 | 行为 |
|------|------|------|
| <!-- 例：登录 | 点击登录按钮 | 校验 → 调用 useAuthService.login → 跳转 --> |

## 项目上下文

- types: <!-- 自动发现或手动填写，如：LoginFormModel -->
- services: <!-- 自动发现或手动填写，如：useAuthService -->
- reference: <!-- 参考页面路径，如：pages/login/index.vue -->

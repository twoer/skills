# Design Spec: {pageId}

## 来源

- MasterGo: {url}
- 提取时间: {date}

## Design Tokens

### Element Plus 主题

| 变量 | 值 | 说明 |
|------|-----|------|
| <!-- 例：--el-color-primary | #02B3D6 | 品牌主色 --> |

### Tailwind 扩展（非颜色）

| 变量 | 值 | 说明 |
|------|-----|------|
| <!-- 仅定义非颜色类 token，如 fontFamily、spacing。颜色统一走 Element Plus 主题层 --> |

### Scoped SCSS

| 变量 | 值 | 说明 |
|------|-----|------|
| <!-- 例：--shadow-card | 0px 20px 25px... | 卡片阴影 --> |

## 布局结构

<!-- 描述页面整体布局，如：左右分栏（flex: 1 + 1）、顶部导航 + 内容区、弹窗等 -->

<!-- 语义化组件树（由 ui-add 步骤 5a 填充）示例：
└── PageRoot (页面)
    ├── HeaderNav (头部导航)
    └── HeroSection (主内容区)
        ├── HeroTitle (标题) [欢迎使用]
        └── CTAButton (按钮) [立即体验]

覆盖层节点示例（含定位坐标）：
    ├── IllustrationBg (图片) [背景插图]
    └── HeroText (覆盖层) [x=40, y=100]  ← 相对父容器左上角的 bounds 坐标
-->

## 资源清单

| 语义名 | 类型 | DSL 节点 ID | 用途 | 处理方式 |
|--------|------|------------|------|---------|
| <!-- 例：LogoIcon | LAYER (PNG) | 2:00986 | 侧边栏 Logo | 下载到 assets/images/ -->
| <!-- 例：MenuIcon | PATH (SVG) | 2:00996 | 菜单图标"数据统计" | 导出为 SVG 组件 -->
| <!-- 例：SearchIcon | INSTANCE | 2:1259 | 工具栏搜索 | 使用 EP 图标或导出 SVG -->

## 组件清单

| 区域 | Element Plus 组件 | EP 属性 | height-override | 文本换行 | Tailwind 样式 | 说明 |
|------|-------------------|---------|----------------|---------|--------------|------|
| <!-- 例：搜索栏 | ElInput, ElButton | size="default" | — | — | flex, gap-4 | 关键词 + 状态筛选 -->
| <!-- 例：登录表单 | ElForm | label-position="top" | — | — | w-full | 邮箱+密码 -->
| <!-- 例：登录输入框 | ElInput | size="default" | 36px | — | — | 设计稿高度 36px，EP default=32px -->
| <!-- 例：协议勾选 | ElCheckbox | — | — | .el-checkbox__label { white-space: normal } | — | 协议文案需换行 --> |

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

## 业务需求

> 由 `/fe-dev:spec req-gen` 的 plan.md 自动填充（如有），也可手动编写。

### 校验规则

| 字段 | 规则 | 错误提示 |
|------|------|---------|
| <!-- 例：username | required, 3-20 字符, 字母数字 | 请输入 3-20 位用户名 --> |

### 错误处理

| 场景 | 处理方式 |
|------|---------|
| <!-- 例：提交失败 | ElMessage.error 显示服务端错误信息 --> |

### 条件逻辑

| 条件 | 表现 |
|------|------|
| <!-- 例：isAdmin | 显示删除按钮 --> |

### 状态管理

| 状态 | 触发 | 表现 |
|------|------|------|
| <!-- 例：loading | 提交中 | 按钮 loading + 骨架屏 --> |

# UI Gen 图片资源本地化

## 背景

当前 ui-gen 生成代码时，如果设计稿中包含图片（logo、背景图、图标等），生成的 .vue 文件会直接引用 MasterGo 远程地址。上线后面临外部依赖不可控、无法走项目 CDN、构建产物不含资源等问题。

## 目标

在 ui-gen 阶段，将设计稿中的图片资源（光栅图 + SVG）下载到 Vue 页面本地目录，生成代码时引用本地路径。

## 目录规则

每个 Vue 页面拥有独立的资源目录，基于目标文件路径推导：

```
{vue文件所在目录}/assets/images/{原始文件名}
```

示例：

```
pages/login/index.vue
pages/login/assets/images/logo.png
pages/login/assets/images/bg.svg

pages/user-list/index.vue
pages/user-list/assets/images/avatar.png
```

## 流程变更

在 ui-gen 现有步骤 4（扫描项目上下文）和步骤 5（生成代码）之间，新增步骤 4e。

### 新增步骤 4e：下载图片资源

1. 从设计数据中收集所有图片资源（光栅图 + SVG）
2. 图片来源：
   - D2C 返回的 `data.payload.image` 中的远程 URL
   - D2C 返回的 `data.payload.svg` 中的 SVG 内容
3. 按目录规则创建 `{pageDir}/assets/images/` 目录
4. 下载每个图片到本地，保留原始文件名
5. SVG 如果是纯内容（非 URL），写入 `.svg` 文件
6. 构建路径映射表：`{远程URL或原始名} → {本地相对路径}`
7. 步骤 5 生成代码时，将所有远程图片引用替换为本地路径

### 路径映射表

```
{
  "https://image-resource.mastergo.com/.../logo.png": "./assets/images/logo.png",
  "icon-xxx": "./assets/images/icon-xxx.svg"
}
```

### 代码中的引用方式

```vue
<img src="./assets/images/logo.png" alt="logo" />
```

## 不变的部分

- ui-add 流程不变，不需要感知图片下载
- design-spec 模板不变
- ui-update、ui-check 流程不变

## 涉及文件

- `fe-dev/skills/ui-gen/SKILL.md` — 新增步骤 4e

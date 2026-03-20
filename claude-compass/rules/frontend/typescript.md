---
description: TypeScript 编码规范
paths:
  - "app/**/*.ts"
  - "app/**/*.vue"
  - "src/**/*.ts"
  - "src/**/*.vue"
---

# TypeScript 规范

## 要求

- 禁止使用 `any`，必须使用具体类型或泛型
- 数据模型命名：`XXModel`（数据模型）、`XXFormModel`（表单模型）
- 接口优先使用 `interface`，联合类型/交叉类型使用 `type`
- 函数参数超过 3 个时使用对象参数 + 解构
- API 响应类型必须定义，不依赖隐式推断
- 导出类型使用 `export type` 而非 `export`

## 原因

严格的类型约束是 TypeScript 的核心价值，`any` 会让类型系统形同虚设。

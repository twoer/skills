---
description: Vue 组件通信约定，定义 Props、Emits 和双向绑定的标准写法
paths:
  - "app/**/*.vue"
  - "src/**/*.vue"
---

# 组件通信约定

## 要求

- Props 使用 `defineProps<T>()` 泛型写法，禁止运行时声明
- 有默认值时使用 `withDefaults(defineProps<T>(), { ... })`
- Emits 使用 `defineEmits<T>()` 泛型写法，参数用 tuple 类型定义
- 双向绑定遵循 `modelValue` + `update:modelValue` 模式

## 示例

正确：
```typescript
const props = withDefaults(
  defineProps<{
    modelValue: string[];
    maxCount?: number;
    disabled?: boolean;
  }>(),
  {
    maxCount: 10,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'change': [value: string[]];
}>();
```

错误：
```typescript
// 运行时声明，缺少类型安全
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  maxCount: { type: Number, default: 10 },
});

// emit 无类型约束
const emit = defineEmits(['update:modelValue', 'change']);
```

## 原因

泛型写法提供编译期类型检查，tuple 类型约束 emit 参数，防止传参错误。

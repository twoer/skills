---
description: 列表页面标准模式，定义搜索表单、分页、加载状态和异步操作约定
paths:
  - "app/pages/**/*.vue"
  - "src/pages/**/*.vue"
---

# 列表页面模式

## 要求

- 搜索表单使用 `ref(getDefaultSearchFormModel())` 初始化，提供工厂函数便于重置
- 分页字段（`current`、`size`）集成在搜索表单模型中，不单独维护
- 搜索时必须重置分页：`searchFormModel.value.current = 1`
- 页面加载状态使用单一 `loading` ref，专项操作（如导出）使用独立 ref
- 异步操作必须用 `try/finally` 确保 loading 状态恢复
- 多个无依赖请求使用 `Promise.all()` 并行

## 示例

正确：
```typescript
const getDefaultSearchFormModel = (): SearchFormModel => ({
  keyword: '',
  current: 1,
  size: DEFAULT_PAGE_SIZE,
});

const searchFormModel = ref(getDefaultSearchFormModel());
const loading = ref(false);

const handleSearch = async () => {
  searchFormModel.value.current = 1;
  loading.value = true;
  try {
    await Promise.all([loadList(), loadSummary()]);
  } catch {
    ElMessage.error('查询失败');
  } finally {
    loading.value = false;
  }
};

const handleReset = () => {
  searchFormModel.value = getDefaultSearchFormModel();
  handleSearch();
};
```

错误：
```typescript
// 分页和表单分离维护
const page = ref(1);
const size = ref(10);
const form = ref({ keyword: '' });

// 忘记 finally，loading 可能卡住
loading.value = true;
await loadList();
loading.value = false;
```

## 原因

统一的列表页模式降低新页面开发成本，工厂函数确保重置彻底，try/finally 防止 loading 状态异常。

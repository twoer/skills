---
description: Service 层架构约定，定义 API 服务封装和 HTTP 调用模式
paths:
  - "app/composables/**/*.ts"
  - "src/composables/**/*.ts"
---

# Service 层架构

## 要求

- 每个业务模块对应一个 `useXxxService()` composable，放在 `composables/` 下
- Service 内部统一使用 `useHttp()` 发起请求，禁止直接使用 fetch/axios
- API 路径使用相对路径（不含 `/api` 前缀），由 useHttp 统一拼接
- 每个方法必须声明请求类型和响应类型泛型
- Service 返回对象，包含所有 API 方法

## 示例

正确：
```typescript
export function useCpsReportService() {
  const http = useHttp();

  async function getCpsReport(data: CpsReportSearchFormModel) {
    return http.post<CpsReportSearchFormModel, PageResult<CpsReportItemModel>>(
      '/reports/cps',
      data,
    );
  }

  return { getCpsReport };
}
```

错误：
```typescript
// 直接在页面中调 fetch
const res = await fetch('/api/reports/cps', { method: 'POST', body: JSON.stringify(data) });
```

## 原因

统一的 Service 层隔离了页面与网络请求的耦合，便于 Mock 测试和统一错误处理。

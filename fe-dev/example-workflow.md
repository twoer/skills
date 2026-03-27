# 前端功能开发工作流对话记录

> 本文档记录了使用 Claude Code 进行前端功能开发的完整过程，供团队成员参考。

**项目**: 示例后台项目 (example-admin)
**功能**: 管理员增加角色权限
**日期**: 2026-03-17

---

## 一、创建功能分支和目录结构

### 👤 用户输入

```
/fe-dev:feat-new
```

### 🤖 Claude 输出

当前状态：
- 当前分支: `dev_feature_xxx`
- 有未跟踪的文件 (`.claude/`, `docs/`）

**获取功能名称:**

> 用户输入: "管理员增加角色权限"

功能名称: `admin-role-permission`

**选择源分支:**

> 用户选择: `develop`

**处理未提交代码并创建分支:**

```bash
git checkout develop
git pull origin develop
git checkout -b feat/admin-role-permission
```

**创建目录结构:**

```
docs/features/feat-admin-role-permission/
├── index.md          # 功能元信息
├── requirements/     # 需求文档
└── dev/
    ├── plan.md       # 开发计划
    ├── exec.md       # 执行日志
    ├── test.md       # 测试记录
    └── review.md     # 代码审查
```

**补充需求链接:**

> 用户输入: `https://example.com/wiki/xxxxxxxxxxxx`

✅ **功能工作流创建完成**

| 项目 | 值 |
|------|-----|
| 功能名称 | `admin-role-permission` |
| 功能描述 | 管理员增加角色权限 |
| 功能分支 | `feat/admin-role-permission` |
| 源分支 | `develop` |
| 需求文档 | [需求文档](https://example.com/wiki/xxxxxxxxxxxx) |

---

## 二、同步需求文档

### 👤 用户输入

```
/fe-dev:feat-req sync
```

### 🤖 Claude 输出

当前功能: `feat/admin-role-permission`
需求文档: `https://example.com/wiki/xxxxxxxxxxxx`

正在同步飞书文档...

✅ **需求文档同步成功**

**同步文件:**
- `requirements/角色权限功能.md`
- `requirements/files/角色权限管理实现方案.md`

**需求概要:**

| 项目 | 内容 |
|------|------|
| 需求背景 | 实现后台角色权限管理 (RBAC)，不同角色拥有不同接口访问权限 |
| 角色定义 | `SUPER_ADMIN` (超级管理员) - 所有权限<br>`EXTERNAL_ADMIN` (外部管理员) - 只能访问消耗统计接口 |

**前端改动点:**
1. 用户信息存储 - 需要存储 `roles` 和 `permissions` 字段
2. 权限判断工具函数 - `hasRole()`, `isSuperAdmin()`, `hasPermission()`
3. 路由守卫 - 根据角色控制页面访问
4. 页面级权限控制 - 根据角色显示/隐藏功能
5. 接口错误处理 - 处理 403 权限不足

---

## 三、生成开发计划

### 👤 用户输入

```
/fe-dev:feat-gen
```

### 🤖 Claude 输出

**选择测试类型:**

> 用户选择: "测试注意事项"（手动测试 checklist）

**补充需求:**

> 用户输入: "先看一下 origin/dev_feature_xxx 分支的改动，上周为了紧急上线，是基于 管理员 用户名 硬性做的权限判断，现在基于接口来做判断，这一部分需要移除，但是应该有部分代码可以复用"

**查看现有实现:**

```typescript
// composables/usePermission.ts (现有实现)
const PERMISSION_RULES: PermissionConfig[] = [
  { username: 'example_admin', allowedMenuIds: ['spend-statistics'] }
];
```

**生成开发计划和测试计划:**

✅ **开发计划和测试计划生成完成**

**任务概览:**

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 1. 更新 UserModel 类型定义 | P0 | 新增 roles 字段 |
| 2. 确认 useUserStore | P0 | 可能无需改 |
| 3. 重构 usePermission | P0 | 移除硬编码，改为接口驱动 |
| 4. 更新 permission.global.ts | P0 | 适配新权限判断 |
| 5. 更新 useMenu.ts | P0 | 使用新权限函数 |
| 6. 添加 403 错误处理 | P1 | 友好提示 |
| 7. 清理旧代码 | P1 | 移除硬编码配置 |

---

## 四、确认执行计划

### 👤 用户输入

```
先看看你的执行计划
```

### 🤖 Claude 输出

## 执行计划摘要

### 接口返回（实际）

```json
{
  "data": {
    "id": 1,
    "username": "admin",
    "nickname": "admin",
    "roles": ["SUPER_ADMIN"]
  }
}
```

**只有 `roles`，没有 `permissions`**

### 角色与菜单映射（前端硬编码）

| 角色编码 | 可访问菜单 |
|---------|-----------|
| `SUPER_ADMIN` | 全部菜单 |
| `EXTERNAL_ADMIN` | 仅 `spend-statistics`（消耗统计） |

### 任务清单

| # | 任务 | 改动文件 | 说明 |
|---|------|----------|------|
| 1 | 更新 UserModel 类型 | `types/user.ts` | +`roles: string[]` |
| 2 | 确认 useUserStore | `store/user.ts` | 可能无需改 |
| 3 | 重构 usePermission | `usePermission.ts` | 核心：移除用户名硬编码，改用 roles |
| 4 | 更新路由守卫 | `permission.global.ts` | 用新的 `hasRole()` |
| 5 | 更新菜单过滤 | `useMenu.ts` | 用新的 `hasMenuPermission()` |
| 6 | 403 错误处理 | `services/http.ts` | 友好提示 |
| 7 | 清理调试 | - | 移除旧代码 |

### 核心代码变更（usePermission.ts）

```diff
- const PERMISSION_RULES = [{ username: 'example_admin', ... }]
+ const isSuperAdmin = () => user?.roles?.includes('SUPER_ADMIN');
+ const hasRole = (role) => user?.roles?.includes(role);
+ const hasMenuPermission = (menuId) => {
+   if (isSuperAdmin()) return true;
+   if (hasRole('EXTERNAL_ADMIN')) return menuId === 'spend-statistics';
+   return true;
+ };
```

---

### 👤 用户输入

```
我看了一下接口的返回，{
    "code": 0,
    "msg": null,
    "data": {
        "id": 1,
        "username": "admin",
        "nickname": "admin",
        "roles": [
            "SUPER_ADMIN"
        ]
    }
}  ，实际上只返回了 角色 "roles": [
            "SUPER_ADMIN"
        ]，相当于前端还是需要 写死逻辑，比如 roles 里面包含 SUPER_ADMIN ，就是可以访问所有页面，如果 roles 里面只有 EXTERNAL_ADMIN ，就只能访问 消耗统计
```

### 🤖 Claude 输出

明白了，后端只返回 `roles`，没有 `permissions`。前端需要根据角色编码做菜单映射。

**更新计划:** 移除 `permissions` 相关字段，只保留 `roles`。

---

### 👤 用户输入

```
可以
```

### 🤖 Claude 输出

好的，开始执行开发任务。

---

## 五、执行开发任务

### 任务 1: 更新 UserModel 类型定义

**文件**: `types/user.ts`

```typescript
export interface UserModel {
  id: number;
  username: string;
  nickname: string;
  roles?: string[];           // 新增：角色编码列表
}
```

✅ 完成

---

### 任务 2: 重构 usePermission composable

**文件**: `composables/usePermission.ts`

**旧代码（移除）:**
```typescript
const PERMISSION_RULES: PermissionConfig[] = [
  { username: 'example_admin', allowedMenuIds: ['spend-statistics'] }
];
```

**新代码:**
```typescript
import { useUserStore } from '~/composables/store/modules/user';

/** 角色编码常量 */
export const ROLE_CODES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  EXTERNAL_ADMIN: 'EXTERNAL_ADMIN',
} as const;

/** 外部管理员可访问的菜单 ID */
const EXTERNAL_ADMIN_ALLOWED_MENUS = ['spend-statistics'];

export function usePermission() {
  const userStore = useUserStore();

  const getUser = () => userStore.getUserInfo;

  const hasRole = (role: string): boolean => {
    const user = getUser();
    return user?.roles?.includes(role) ?? false;
  };

  const isSuperAdmin = (): boolean => {
    return hasRole(ROLE_CODES.SUPER_ADMIN);
  };

  const isExternalAdmin = (): boolean => {
    return hasRole(ROLE_CODES.EXTERNAL_ADMIN);
  };

  const hasMenuPermission = (menuId: string): boolean => {
    if (isSuperAdmin()) return true;
    if (isExternalAdmin()) {
      return EXTERNAL_ADMIN_ALLOWED_MENUS.includes(menuId);
    }
    return true;
  };

  const getAllowedMenuIds = (): string[] | null => {
    if (isSuperAdmin()) return null;
    if (isExternalAdmin()) return EXTERNAL_ADMIN_ALLOWED_MENUS;
    return null;
  };

  return {
    hasRole,
    isSuperAdmin,
    isExternalAdmin,
    hasMenuPermission,
    getAllowedMenuIds,
  };
}
```

✅ 完成

---

### 任务 3: 更新 permission.global.ts 路由守卫

**文件**: `middleware/permission.global.ts`

```typescript
import { useUserStore } from '~/composables/store/modules/user';
import { usePermission, ROLE_CODES } from '~/composables/usePermission';

const EXTERNAL_ADMIN_ALLOWED_PREFIX = '/spend-statistics';
const EXTERNAL_ADMIN_REDIRECT_TARGET = '/spend-statistics/list';

export default defineNuxtRouteMiddleware(to => {
  if (to.path === '/login' || to.path === '/') {
    return;
  }

  const userStore = useUserStore();
  const userInfo = userStore.getUserInfo;

  if (!userInfo) {
    return;
  }

  const { isSuperAdmin, hasRole } = usePermission();

  // 超级管理员拥有所有路径的访问权限
  if (isSuperAdmin()) {
    return;
  }

  // 外部管理员：只能访问消耗统计相关路径
  if (hasRole(ROLE_CODES.EXTERNAL_ADMIN)) {
    const isAllowed =
      to.path === EXTERNAL_ADMIN_REDIRECT_TARGET ||
      to.path.startsWith(EXTERNAL_ADMIN_ALLOWED_PREFIX + '/');

    if (!isAllowed) {
      return navigateTo(EXTERNAL_ADMIN_REDIRECT_TARGET, { replace: true });
    }
  }
});
```

✅ 完成

---

### 任务 4: 更新 useMenu.ts 菜单过滤逻辑

**文件**: `composables/useMenu.ts`

```diff
- return menuItems.value.filter(item => hasMenuPermission(userInfo.username, item.id));
+ return menuItems.value.filter(item => hasMenuPermission(item.id));
```

✅ 完成

---

### 任务 5: 添加 403 错误处理

**文件**: `services/http.ts`

```diff
  // 处理特殊状态码
- if (responseData.code === 403 || error.response.status === 401) {
+ // 401: 未授权（登录过期/无效 token）
+ if (error.response.status === 401) {
    ElMessage.error('登录已过期，请重新登录');
    // ... 跳转登录页
    return;
  }
+
+ // 403: 权限不足（已登录但无访问权限）
+ if (error.response.status === 403) {
+   ElMessage.error('您没有权限访问此功能');
+   return;
+ }
```

✅ 完成

---

## 六、需求变更 - 权限判断逻辑调整

### 👤 用户输入

```
/fe-dev:feat-update composables/usePermission.ts hasMenuPermission 方法逻辑不对，
应该是 没有分配权限角色，就当做没有任何权限
```

### 🤖 Claude 输出

**当前逻辑**（第 73-75 行）：
```typescript
// 未分配角色或未知角色的用户，默认拥有所有权限
// 后端会在接口层面进行权限控制
return true;
```

**需求变更**：未分配权限角色的用户应该没有任何权限，而不是默认拥有所有权限。

#### 变更摘要

| 文件 | 变更内容 |
|------|----------|
| `composables/usePermission.ts` | `hasMenuPermission()` 未分配角色返回 `false`<br>`getAllowedMenuIds()` 未分配角色返回 `[]` |
| `composables/useMenu.ts` | 更新注释：未分配角色不显示任何菜单 |
| `middleware/permission.global.ts` | 未分配角色用户重定向到 `/login` |
| `requirements/extra.md` | 记录需求变更历史 |

#### 权限逻辑变更对比

```diff
- // 未分配角色或未知角色的用户，默认拥有所有权限
- return true;
+ // 未分配角色的用户没有任何权限
+ return false;
```

```diff
- // 其他用户：不做前端路由限制，后端会在接口层面进行权限控制
+ // 未分配角色的用户：重定向到登录页
+ return navigateTo('/login', { replace: true });
```

---

## 七、Bug 修复 - EXTERNAL_ADMIN 登录跳转问题

### 👤 用户输入

```
/fe-dev:feat-update 目前测试下来还有一个问题，EXTERNAL_ADMIN 用户登录后，
好像默认会到非 spend-statistics 页面，然后触发其他页面的请求，会提示 api 权限错误
```

### 🤖 Claude 输出

**问题链路分析**：
1. 登录成功 → 跳转到 `/`
2. `/` 页面 `onMounted` → 跳转到 `/customer-management/list`
3. EXTERNAL_ADMIN 访问 `/customer-management/list` → 触发 API → 权限错误
4. 路由守卫才重定向到 `/spend-statistics/list`

**根本原因**：首页硬编码跳转到客户管理，没有根据角色判断。

#### 修复方案

修改 `pages/index.vue`，根据用户角色跳转到对应的默认页面：

```typescript
import { usePermission, ROLE_CODES } from '~/composables/usePermission';

const { isSuperAdmin, hasRole } = usePermission();

onMounted(async () => {
  // 根据用户角色跳转到对应的默认页面
  if (isSuperAdmin()) {
    await navigateTo('/customer-management/list');
  } else if (hasRole(ROLE_CODES.EXTERNAL_ADMIN)) {
    await navigateTo('/spend-statistics/list');
  } else {
    // 未分配角色的用户，跳转到登录页
    await navigateTo('/login');
  }
});
```

#### 角色与默认页面映射

| 角色 | 默认页面 |
|------|----------|
| SUPER_ADMIN | `/customer-management/list` |
| EXTERNAL_ADMIN | `/spend-statistics/list` |
| 未分配角色 | `/login` |

---

## 八、完成总结

### 改动文件汇总

| 文件 | 改动 |
|------|------|
| `types/user.ts` | +`roles?: string[]` |
| `composables/usePermission.ts` | 重构：移除用户名硬编码，改用 roles |
| `middleware/permission.global.ts` | 适配新权限 API |
| `composables/useMenu.ts` | 使用新的 `hasMenuPermission(menuId)` |
| `services/http.ts` | +403 权限不足处理 |
| `pages/index.vue` | 根据角色跳转默认页面 |
| `requirements/extra.md` | 记录需求变更和 Bug 修复 |

### 核心改动点

**1. usePermission.ts - 基于角色的权限判断**

```typescript
isSuperAdmin()              // 判断是否是 SUPER_ADMIN
hasRole(role)               // 判断是否有指定角色
hasMenuPermission(menuId)   // 判断菜单权限（无需传 username）
```

**2. permission.global.ts - 路由守卫**

```typescript
if (isSuperAdmin()) return;  // 放行
if (hasRole('EXTERNAL_ADMIN')) {
  // 只允许 /spend-statistics/*
}
// 未分配角色 → 重定向到登录页
```

**3. http.ts - 错误处理**

```typescript
// 401: 登录过期 → 跳转登录页
// 403: 权限不足 → 显示提示，不跳转
```

**4. index.vue - 首页跳转**

```typescript
// 根据角色跳转到对应默认页面
if (isSuperAdmin()) → /customer-management/list
if (hasRole('EXTERNAL_ADMIN')) → /spend-statistics/list
else → /login
```

### 测试验证清单

- [ ] SUPER_ADMIN 登录后能正常访问所有菜单
- [ ] SUPER_ADMIN 登录后默认跳转到客户管理
- [ ] EXTERNAL_ADMIN 登录后只能看到消耗统计菜单
- [ ] EXTERNAL_ADMIN 登录后默认跳转到消耗统计
- [ ] EXTERNAL_ADMIN 访问其他路径会被重定向到消耗统计
- [ ] 未分配角色的用户登录后被重定向到登录页
- [ ] 未分配角色的用户不显示任何菜单

---

## 附录：命令速查

| 命令 | 说明 |
|------|------|
| `/fe-dev:feat-new` | 创建新功能分支和目录 |
| `/fe-dev:feat-req sync` | 同步飞书需求文档 |
| `/fe-dev:feat-gen` | 生成开发/测试计划 |
| `/fe-dev:feat-exec` | 执行开发任务 |
| `/fe-dev:feat-update` | 需求变更，追加到 extra.md |
| `/fe-dev:feat-log <name> <msg>` | 记录开发日志 |
| `/fe-dev:feat-done <name>` | 标记功能完成 |

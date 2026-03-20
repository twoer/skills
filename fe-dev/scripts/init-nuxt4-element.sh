#!/bin/bash

# Nuxt4 + Element Plus Project Initialization Script
# Based on AIMarX-Admin architecture

set -e

# ========================================
# 可配置项（通过环境变量覆盖）
# 示例: PRIMARY_COLOR=#e6a23c DEV_PORT=8080 bash init-nuxt4-element.sh admin
# ========================================
PRIMARY_COLOR="${PRIMARY_COLOR:-#3287ff}"
DEV_PORT="${DEV_PORT:-3001}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-myapp}"

# 重试安装函数
npm_install_with_retry() {
  if ! npm install "$@"; then
    echo "⚠️  npm install failed, trying with Taobao registry..."
    npm install "$@" --registry=https://registry.npmmirror.com
  fi
}

echo "🚀 Initializing Nuxt4 + Element Plus project..."

# Check if directory is empty (except for hidden files)
if [ "$(ls -A | grep -v '^\.' | wc -l)" -gt 0 ]; then
    echo "⚠️  Warning: Current directory is not empty."
    echo "Files will be created alongside existing content."
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Initialization cancelled."
        exit 1
    fi
fi

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed. Please install Node.js first."
    exit 1
fi

# Initialize Nuxt4 project
echo "📦 Creating Nuxt4 project structure..."
# 使用 --template minimal 避免交互式选择,--force 覆盖已存在的目录
# 注意: nuxi 不支持 --registry 参数,需要通过环境变量设置
export NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
npx nuxi@latest init . --packageManager npm --gitInit=false --template minimal --force
unset NPM_CONFIG_REGISTRY

# Check if initialization was successful
if [ ! -f "package.json" ]; then
    echo "❌ Error: Project initialization failed."
    exit 1
fi

echo "📦 Installing all dependencies (this may take a few minutes)..."

# 合并所有依赖为单次安装,大幅提升速度
npm_install_with_retry \
  element-plus @element-plus/nuxt @element-plus/icons-vue \
  pinia @pinia/nuxt \
  @wangeditor-next/editor @wangeditor-next/editor-for-vue \
  vue-advanced-cropper sortablejs xlsx \
  dompurify sanitize-html jsdom \
  bcryptjs crypto-js jsencrypt node-rsa jsonwebtoken svg-captcha \
  mysql2 \
  -D @nuxtjs/tailwindcss sass nuxt-svgo \
  -D eslint @eslint/js typescript-eslint eslint-plugin-vue vue-eslint-parser globals \
  -D stylelint stylelint-config-standard stylelint-config-standard-scss stylelint-config-standard-vue stylelint-scss \
  -D prettier husky lint-staged

echo "📁 Creating project structure..."

# Create directories
mkdir -p app/assets/{icons/svgs,styles}
mkdir -p app/components/{image-upload,wang-editor,clip}
mkdir -p app/composables
mkdir -p app/layouts
mkdir -p app/pages/{home,login}
mkdir -p app/plugins
mkdir -p app/stores
mkdir -p app/types
mkdir -p app/utils
mkdir -p server/{api,database,middleware,plugins,services,utils}
mkdir -p public/uploads

echo "📝 Creating configuration files..."

# Create nuxt.config.ts with Element Plus
cat > nuxt.config.ts << EOF
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  ssr: true,

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
    },
    databaseHost: process.env.DB_HOST || '${DB_HOST}',
    databasePort: parseInt(process.env.DB_PORT || '${DB_PORT}'),
    databaseUser: process.env.DB_USER || '${DB_USER}',
    databasePassword: process.env.DB_PASSWORD || '',
    databaseName: process.env.DB_NAME || '${DB_NAME}',
  },

  modules: [
    '@element-plus/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    'nuxt-svgo'
  ],

  elementPlus: {
    importStyle: 'scss'
  },

  css: [
    '~/assets/styles/tailwind.css',
    '~/assets/styles/element.scss',
    '~/assets/styles/index.scss'
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/styles/variables.scss" as *;'
        }
      }
    }
  },

  devServer: {
    port: ${DEV_PORT}
  }
})
EOF

# Create Tailwind CSS file
cat > app/assets/styles/tailwind.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# Create Element Plus theme file
cat > app/assets/styles/element.scss << EOF
@forward 'element-plus/theme-chalk/src/common/var.scss' with (
  \$colors: (
    'primary': (
      'base': ${PRIMARY_COLOR},
    ),
  )
);
EOF

# Create global styles
cat > app/assets/styles/index.scss << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
EOF

# Create SCSS variables
cat > app/assets/styles/variables.scss << EOF
\$primary-color: ${PRIMARY_COLOR};
\$success-color: #67c23a;
\$warning-color: #e6a23c;
\$danger-color: #f56c6c;
\$info-color: #909399;
EOF

# Create auth store
cat > app/stores/auth.ts << 'EOF'
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    user: null as any
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    userId: (state) => state.user?.id,
    username: (state) => state.user?.username
  },

  actions: {
    setAuth(token: string) {
      this.token = token
    },

    setUser(user: any) {
      this.user = user
    },

    clearAuth() {
      this.token = ''
      this.user = null
    },

    initAuth() {
      // Initialize from localStorage or cookie
    }
  }
})
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Nuxt
.nuxt
.output
.env
dist

# Dependencies
node_modules

# Logs
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.idea
*.swp
*.swo

# Uploads
public/uploads/*
!public/uploads/.gitkeep
EOF

touch public/uploads/.gitkeep

# Create .env.example
cat > .env.example << EOF
# API 基础地址（前端请求后端接口的前缀）
NUXT_PUBLIC_API_BASE=/api

# 数据库配置（服务端使用，不会暴露给前端）
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=
DB_NAME=${DB_NAME}
EOF

echo "📝 Creating linting & formatting configs..."

# ESLint config (flat config)
cat > eslint.config.mjs << 'EOF'
// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    ignores: [
      'node_modules',
      '.nuxt',
      '.output',
      'dist',
      '.cache',
      'public',
      '*.min.js',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      '*.config.ts',
    ],
  },
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
        // Nuxt auto-imports
        defineNuxtConfig: 'readonly',
        defineNuxtRouteMiddleware: 'readonly',
        defineEventHandler: 'readonly',
        getQuery: 'readonly',
        readBody: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
      'no-debugger': 'error',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        // Nuxt auto-imports
        definePageMeta: 'readonly',
        useNuxtApp: 'readonly',
        useRouter: 'readonly',
        useRoute: 'readonly',
        navigateTo: 'readonly',
        useState: 'readonly',
        useFetch: 'readonly',
        useAsyncData: 'readonly',
        ref: 'readonly',
        computed: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        onMounted: 'readonly',
        onBeforeMount: 'readonly',
        onBeforeUnmount: 'readonly',
        onUnmounted: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^((use|define|on|handle)[A-Z])|\\$' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
      'no-debugger': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/max-attributes-per-line': ['warn', { singleline: { max: 3 }, multiline: { max: 1 } }],
    },
  },
];
EOF

# Prettier config
cat > prettier.config.mjs << 'EOF'
// prettier.config.mjs
export default {
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',
  printWidth: 100,
  tabWidth: 2,
  jsxSingleQuote: false,
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
};
EOF

# Stylelint config
cat > stylelint.config.cjs << 'EOF'
// stylelint.config.cjs
module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-standard-scss',
    'stylelint-config-standard-vue',
  ],
  plugins: ['stylelint-scss'],
  rules: {
    'at-rule-no-unknown': [
      true,
      { ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen', 'layer', 'config', 'forward', 'use', 'import'] },
    ],
    'scss/at-rule-no-unknown': [
      true,
      { ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen', 'layer', 'config', 'forward', 'use', 'import'] },
    ],
    'selector-class-pattern': null,
    'function-no-unknown': [true, { ignoreFunctions: ['theme'] }],
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'no-descending-specificity': null,
    'no-empty-source': null,
    'media-feature-range-notation': null,
  },
};
EOF

# VS Code settings
mkdir -p .vscode
cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.fixAll.stylelint": "explicit"
  },
  "css.validate": false,
  "stylelint.validate": ["css", "scss", "vue"],
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
EOF

# VS Code extensions recommendations
cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "stylelint.vscode-stylelint",
    "vue.volar"
  ]
}
EOF

# Update package.json with lint scripts
if command -v jq &> /dev/null; then
  tmp=$(mktemp)
  jq '.scripts += {
    "prepare": "husky",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "stylelint": "stylelint \"**/*.{css,scss,vue}\"",
    "stylelint:fix": "stylelint \"**/*.{css,scss,vue}\" --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }' package.json > "$tmp" && mv "$tmp" package.json
else
  echo "⚠️  jq not found. Please manually add lint scripts to package.json:"
  echo '  "lint": "eslint ."'
  echo '  "lint:fix": "eslint . --fix"'
  echo '  "stylelint": "stylelint \"**/*.{css,scss,vue}\""'
  echo '  "stylelint:fix": "stylelint \"**/*.{css,scss,vue}\" --fix"'
  echo '  "format": "prettier --write ."'
  echo '  "format:check": "prettier --check ."'
fi

# Configure lint-staged in package.json
if command -v jq &> /dev/null; then
  tmp=$(mktemp)
  jq '.lintStaged = {
    "*.{js,ts,vue}": ["eslint --fix", "prettier --write"],
    "*.{css,scss,vue}": ["stylelint --fix"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }' package.json > "$tmp" && mv "$tmp" package.json
else
  echo "⚠️  jq not found. Please manually add lint-staged config to package.json:"
  echo '  "lint-staged": {'
  echo '    "*.{js,ts,vue}": ["eslint --fix", "prettier --write"],'
  echo '    "*.{css,scss,vue}": ["stylelint --fix"],'
  echo '    "*.{json,md,yml,yaml}": ["prettier --write"]'
  echo '  }'
fi

# Initialize git repo if not already (required for husky)
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
  echo "📝 Initializing git repository..."
  git init
fi

# Initialize husky
echo "📝 Setting up husky git hooks..."
npx husky init

# Overwrite default pre-commit hook with lint-staged
cat > .husky/pre-commit << 'HUSKYEOF'
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
HUSKYEOF
chmod +x .husky/pre-commit

echo "📝 Creating composables..."


# Create useHttp composable
cat > app/composables/useHttp.ts << 'EOF'
/**
 * HTTP composable for making API requests
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Query params type
 */
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

/**
 * Request options
 */
interface RequestOptions<T = unknown> {
  method?: HttpMethod;
  params?: QueryParams;
  body?: T;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Unified HTTP client with error handling
 */
export function useHttp() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase as string;

  /**
   * Handle error response
   */
  const handleError = (error: unknown): never => {
    if (import.meta.dev) {
      console.error('HTTP Request Error:', error);
    }

    // If it's already an Error object with a message, use it directly
    if (error instanceof Error) {
      throw error;
    }

    // Otherwise, throw a generic error
    throw new Error('网络错误,请稍后重试');
  };

  /**
   * Base request method
   */
  const request = async <TRequest = unknown, TResponse = unknown>(
    url: string,
    options: RequestOptions<TRequest> = {},
  ): Promise<TResponse> => {
    const { method = 'GET', params, body, headers = {}, timeout = 30000 } = options;

    try {
      const response = await $fetch<HttpResponse<TResponse>>(\`\${apiBase}\${url}\`, {
        method,
        params,
        body: method !== 'GET' && method !== 'DELETE' ? (body as BodyInit) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        credentials: 'include',
        timeout,
        // 关键：不要在非2xx状态码时抛出异常，让我们自己处理
        ignoreResponseError: true,
      });

      if (import.meta.dev) {
        console.log('Response:', response);
      }

      // Check response code
      if (response.code === 200 && response.data !== undefined) {
        return response.data;
      }

      // Handle business error (non-200 code in response body)
      throw new Error(response.message || 'Request failed');
    } catch (error) {
      return handleError(error);
    }
  };

  /**
   * GET request
   */
  const get = <TResponse = unknown>(url: string, params?: QueryParams): Promise<TResponse> => {
    return request<unknown, TResponse>(url, { method: 'GET', params });
  };

  /**
   * POST request
   */
  const post = <TRequest = unknown, TResponse = unknown>(
    url: string,
    body?: TRequest,
  ): Promise<TResponse> => {
    return request<TRequest, TResponse>(url, { method: 'POST', body });
  };

  /**
   * PUT request
   */
  const put = <TRequest = unknown, TResponse = unknown>(
    url: string,
    body?: TRequest,
  ): Promise<TResponse> => {
    return request<TRequest, TResponse>(url, { method: 'PUT', body });
  };

  /**
   * PATCH request
   */
  const patch = <TRequest = unknown, TResponse = unknown>(
    url: string,
    body?: TRequest,
  ): Promise<TResponse> => {
    return request<TRequest, TResponse>(url, { method: 'PATCH', body });
  };

  /**
   * DELETE request
   */
  const del = <TResponse = unknown>(url: string): Promise<TResponse> => {
    return request<unknown, TResponse>(url, { method: 'DELETE' });
  };

  return {
    request,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}
EOF

# Create demo service composable (example)
cat > app/composables/useDemoService.ts << 'EOF'
// Demo service composable - example of how to structure API services
// Copy and modify this pattern for your own services

interface DemoItem {
  id: number
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

interface DemoListParams {
  page?: number
  pageSize?: number
  keyword?: string
}

export function useDemoService() {
  const http = useHttp()

  const getList = async (params: DemoListParams = {}) => {
    return http.get<{ list: DemoItem[]; total: number }>('/api/demo/list', params)
  }

  const getById = async (id: number) => {
    return http.get<DemoItem>(\`/api/demo/\${id}\`)
  }

  const create = async (data: Omit<DemoItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    return http.post<DemoItem>('/api/demo/create', data)
  }

  const update = async (id: number, data: Partial<Omit<DemoItem, 'id' | 'createdAt' | 'updatedAt'>>) => {
    return http.put<DemoItem>(\`/api/demo/\${id}\`, data)
  }

  const remove = async (id: number) => {
    return http.del<void>(\`/api/demo/\${id}\`)
  }

  return {
    getList,
    getById,
    create,
    update,
    remove,
  }
}
EOF

echo "📁 Creating server structure..."

# Create server utilities
mkdir -p server/utils

cat > server/utils/database.ts << 'EOF'
import mysql, { Pool } from 'mysql2/promise'

let pool: Pool | null = null

export interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit?: number
}

export function getDbPool(): Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    const dbConfig: DatabaseConfig = {
      host: config.databaseHost,
      port: config.databasePort,
      user: config.databaseUser,
      password: config.databasePassword,
      database: config.databaseName,
      connectionLimit: 10,
    }
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

export async function executeQuery<T>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const pool = getDbPool()
  const [rows] = await pool.execute<T[]>(sql, params)
  return rows
}

export async function executeSingle<T>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await executeQuery<T>(sql, params)
  return rows[0] || null
}
EOF

cat > server/utils/sanitize.ts << 'EOF'
import sanitizeHtml from 'sanitize-html'

export { sanitizeHtml }

export function sanitizeObject<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
  const result = { ...obj }
  for (const field of fields) {
    if (typeof obj[field] === 'string') {
      result[field] = sanitizeHtml(obj[field], {
        allowedTags: [],
        allowedAttributes: {},
      })
    } else {
      result[field] = obj[field]
    }
  }
  return result
}
EOF

echo "📁 Creating server services directory..."
mkdir -p server/services

echo "📝 Creating example server service..."

cat > server/services/demo.ts << 'EOF'
// Demo service - example of server-side service structure
// Reference this pattern when creating your own services

import { RowDataPacket } from 'mysql2/promise'
import { getDbPool } from '#utils/database'

export interface DemoRecord {
  id: number
  name: string
  description?: string
  created_at: Date
  updated_at: Date
}

export async function getDemoList(
  page: number = 1,
  pageSize: number = 10,
  keyword?: string
): Promise<{ list: DemoRecord[]; total: number }> {
  const pool = getDbPool()
  const offset = (page - 1) * pageSize

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (keyword) {
    whereClause += ' AND name LIKE ?'
    params.push(\`%\${keyword}%\`)
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
        \`SELECT * FROM demo \${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?\`,
        [...params, pageSize, offset]
    )

    const [countResult] = await pool.execute<RowDataPacket[]>(
        \`SELECT COUNT(*) as total FROM demo \${whereClause}\`,
        [...params]
    )

    return {
        list: rows as DemoRecord[],
        total: countResult[0].total,
    }
}
EOF

echo "📝 Creating example API route..."

# Create demo API route
mkdir -p server/api/demo
cat > server/api/demo/index.ts << 'EOF'
// Demo API routes - example structure
// Reference this pattern when creating your own API routes

import { getDemoList } from '#services/demo'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { page = 1, pageSize = 10, keyword } = query as any

    const result = await getDemoList(page, pageSize, keyword)
    return result
})
EOF

echo "📝 Creating project type specific files..."

# Get project type from argument (default: simple)
PROJECT_TYPE="${1:-simple}"

if [ "$PROJECT_TYPE" = "admin" ]; then
  echo "📁 Creating admin project files..."

  # Create admin layout (only for admin project type)
  cat > app/layouts/admin.vue << 'EOF'
<template>
  <el-container class="admin-layout">
    <el-aside width="220px">
      <div class="side-header">
        <h1 class="logo">Admin</h1>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header>
        <div class="header-content">
          <span class="page-title">{{ pageTitle }}</span>
          <div class="user-info">
            <el-dropdown @command="handleUserAction">
              <div class="user-avatar">
                <el-avatar :size="32" :icon="UserFilled" />
                <span class="username">{{ authStore.username || 'Admin' }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>
      <el-main>
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { HomeFilled, User, Setting, UserFilled } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const route = useRoute()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/dashboard': '仪表盘',
    '/users': '用户管理',
    '/settings': '系统设置'
  }
  return titles[route.path] || '管理后台'
})

const handleUserAction = async (command: string) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人信息功能开发中')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
        authStore.clearAuth()
        await navigateTo('/login')
      } catch {
        // User cancelled
      }
      break
  }
}
</script>

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
  overflow: hidden;

  .el-aside {
    background: #304156;
    .side-header {
      padding: 20px;
      .logo {
        color: #fff;
        font-size: 18px;
        font-weight: 600;
      }
    }
    .el-menu {
      border-right: none;
    }
  }

  .el-header {
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
    padding: 0 20px;
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      .page-title {
        font-size: 18px;
        font-weight: 500;
      }
      .user-info {
        .user-avatar {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          .username {
            font-size: 14px;
          }
        }
      }
    }
  }

  .el-main {
    background: #f5f7fa;
    padding: 20px;
  }
}
</style>
EOF

  # Create login page
  cat > app/pages/login.vue << 'EOF'
<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2 class="login-title">Admin Login</h2>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" class="w-full" native-type="submit">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

definePageMeta({ layout: false })

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const authStore = useAuthStore()

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!await formRef.value?.validate()) return
  loading.value = true
  try {
    // Demo: accept any credentials
    authStore.setAuth('demo-token')
    authStore.setUser({ id: 1, username: form.username })
    ElMessage.success('登录成功')
    await navigateTo('/dashboard')
  } catch (e) {
    ElMessage.error('登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  .login-card {
    width: 400px;
    .login-title {
      text-align: center;
      margin: 0;
      font-size: 24px;
    }
  }
}
.w-full { width: 100%; }
</style>
EOF

  # Create dashboard page
  mkdir -p app/pages/dashboard
  cat > app/pages/dashboard/index.vue << 'EOF'
<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6" v-for="stat in stats" :key="stat.title">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-title">{{ stat.title }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const stats = [
  { title: '用户总数', value: '1,234' },
  { title: '今日访问', value: '567' },
  { title: '订单数量', value: '89' },
  { title: '收入', value: '¥12,345' }
]
</script>

<style scoped lang="scss">
.dashboard {
  .stat-card {
    text-align: center;
    padding: 20px 0;
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #409eff;
    }
    .stat-title {
      font-size: 14px;
      color: #909399;
      margin-top: 8px;
    }
  }
}
</style>
EOF

  # Create users page (CRUD example)
  mkdir -p app/pages/users
  cat > app/pages/users/index.vue << 'EOF'
<template>
  <div class="users-page">
    <div class="toolbar">
      <el-button type="primary" @click="handleAdd">新增用户</el-button>
      <el-input v-model="keyword" placeholder="搜索用户" style="width: 200px" clearable />
    </div>
    <el-table :data="tableData" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="status" label="状态">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      class="pagination"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="handlePageChange"
      layout="total, prev, pager, next"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(100)

const tableData = ref([
  { id: 1, username: 'admin', email: 'admin@example.com', status: 'active' },
  { id: 2, username: 'user1', email: 'user1@example.com', status: 'active' },
  { id: 3, username: 'user2', email: 'user2@example.com', status: 'inactive' }
])

const handleAdd = () => {
  ElMessage.info('新增用户功能开发中')
}

const handleEdit = (row: any) => {
  ElMessage.info(\`编辑用户: \${row.username}\`)
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(\`确定删除用户 \${row.username}？\`, '提示', { type: 'warning' })
    .then(() => ElMessage.success('删除成功'))
    .catch(() => {})
}

const handlePageChange = (p: number) => {
  page.value = p
}
</script>

<style scoped lang="scss">
.users-page {
  .toolbar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .pagination {
    margin-top: 20px;
    justify-content: flex-end;
  }
}
</style>
EOF

  # Create settings page
  mkdir -p app/pages/settings
  cat > app/pages/settings/index.vue << 'EOF'
<template>
  <div class="settings-page">
    <el-card>
      <template #header>
        <span>系统设置</span>
      </template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="网站名称">
          <el-input v-model="form.siteName" />
        </el-form-item>
        <el-form-item label="网站描述">
          <el-input v-model="form.siteDescription" type="textarea" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const form = reactive({
  siteName: 'My Admin',
  siteDescription: 'A modern admin dashboard'
})

const handleSave = () => {
  ElMessage.success('设置已保存')
}
</script>

<style scoped lang="scss">
.settings-page {
  max-width: 600px;
}
</style>
EOF

  # Update index.vue to redirect to dashboard
  cat > app/pages/index.vue << 'EOF'
<template>
  <div></div>
</template>

<script setup lang="ts">
// Redirect to dashboard if logged in, otherwise to login
const authStore = useAuthStore()

onMounted(() => {
  if (authStore.isLoggedIn) {
    navigateTo('/dashboard')
  } else {
    navigateTo('/login')
  }
})
</script>
EOF

  echo "✅ Admin project files created!"

else
  echo "📁 Creating simple project files..."

  # Create default layout for simple project
  cat > app/layouts/default.vue << 'EOF'
<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="container">
        <h1 class="logo">My App</h1>
        <nav class="nav">
          <NuxtLink to="/" class="nav-link">首页</NuxtLink>
          <NuxtLink to="/about" class="nav-link">关于</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="app-main">
      <div class="container">
        <slot />
      </div>
    </main>
    <footer class="app-footer">
      <div class="container">
        <p>&copy; 2026 My App. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  .container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 60px;
  }
  .logo { font-size: 20px; font-weight: 600; }
  .nav {
    display: flex;
    gap: 20px;
    .nav-link {
      color: #606266;
      text-decoration: none;
      &:hover { color: #409eff; }
    }
  }
}
.app-main {
  flex: 1;
  padding: 40px 20px;
  .container { max-width: 1200px; margin: 0 auto; }
}
.app-footer {
  background: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  padding: 20px;
  text-align: center;
  color: #909399;
}
</style>
EOF

  # Create home page
  cat > app/pages/index.vue << 'EOF'
<template>
  <div class="home-page">
    <h1>Welcome to My App</h1>
    <p class="description">This is a simple Nuxt 4 + Element Plus project.</p>
    <el-button type="primary" @click="count++">
      Count: {{ count }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
const count = ref(0)
</script>

<style scoped lang="scss">
.home-page {
  text-align: center;
  h1 { font-size: 32px; margin-bottom: 16px; }
  .description { color: #909399; margin-bottom: 24px; }
}
</style>
EOF

  # Create about page
  cat > app/pages/about.vue << 'EOF'
<template>
  <div class="about-page">
    <h1>About Us</h1>
    <p>This is the about page of our application.</p>
  </div>
</template>

<style scoped lang="scss">
.about-page {
  h1 { font-size: 28px; margin-bottom: 16px; }
  p { color: #606266; }
}
</style>
EOF

  echo "✅ Simple project files created!"
fi

# ========================================
# Verification - 检查初始化结果
# ========================================
echo ""
echo "🔍 Verifying project initialization..."
echo ""

# 定义必须存在的文件
REQUIRED_FILES=(
  "package.json"
  "nuxt.config.ts"
  "app/app.vue"
  "app/composables/useHttp.ts"
  "app/composables/useDemoService.ts"
  ".gitignore"
  "eslint.config.mjs"
  "prettier.config.mjs"
  ".vscode/settings.json"
  ".vscode/extensions.json"
)

# 定义必须存在的目录
REQUIRED_DIRS=(
  "app"
  "app/pages"
  "app/layouts"
  "app/components"
  "app/composables"
  "app/stores"
  "app/assets"
  "app/assets/styles"
  "server"
  "server/utils"
  "server/api"
)

MISSING_FILES=()
MISSING_DIRS=()

# 检查文件
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

# 检查目录
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    MISSING_DIRS+=("$dir")
  fi
done

# 输出结果
if [ ${#MISSING_FILES[@]} -eq 0 ] && [ ${#MISSING_DIRS[@]} -eq 0 ]; then
  echo "✅ All required files and directories created successfully!"
  echo ""
  echo "📋 Summary:"
  echo "   - Files checked: ${#REQUIRED_FILES[@]}"
  echo "   - Directories checked: ${#REQUIRED_DIRS[@]}"
  echo ""
  echo "🚀 Next steps:"
  echo "   1. cd $(pwd)"
  echo "   2. npm run dev"
  echo ""
else
  echo "⚠️  Initialization verification failed!"
  echo ""

  if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "❌ Missing files:"
    for file in "${MISSING_FILES[@]}"; do
      echo "   - $file"
    done
    echo ""
  fi

  if [ ${#MISSING_DIRS[@]} -gt 0 ]; then
    echo "❌ Missing directories:"
    for dir in "${MISSING_DIRS[@]}"; do
      echo "   - $dir"
    done
    echo ""
  fi

  echo "💡 Please check the script execution for errors."
fi

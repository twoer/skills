---
name: init
description: 初始化新前端项目，交互式选择模板。触发词: "fe-dev init", "初始化项目", "创建项目", "新建项目"
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Project Init - 项目初始化


执行项目初始化，支持选择项目类型和关联远程 Git 仓库。

## 执行流程

1. **检测环境** → 检查 package.json、配置文件、目录结构
2. **选择项目类型** → 普通项目 / 中台项目
3. **关联 Git** → 单次 AskUserQuestion 获取远程地址
4. **执行初始化** → 运行 `<skill-path>/scripts/init-nuxt4-element.sh`
5. **生成 CLAUDE.md** → 分析项目结构并生成

## 环境检测

```bash
has_package_json = exists("package.json")
has_src_structure = exists("src/") OR exists("app/") OR exists("pages/") OR exists("components/")
has_config = exists("nuxt.config.ts") OR exists("vite.config.ts")

is_project = (has_package_json AND has_src_structure)
          OR (has_package_json AND has_config)
          OR (has_src_structure AND has_config)
```

## 支持的模板

- `simple` - 普通项目（默认 layout）
- `admin` - 中台项目（管理端 layout）

技术栈：Nuxt 4 + Vue 3 + TypeScript + Element Plus + Tailwind CSS + Pinia

## 验证清单

- `package.json` / `nuxt.config.ts` / `app/app.vue` / `.gitignore`
- `eslint.config.mjs` / `prettier.config.mjs` / `.vscode/settings.json`
- `app/composables/useHttp.ts` / `app/stores/auth.ts`

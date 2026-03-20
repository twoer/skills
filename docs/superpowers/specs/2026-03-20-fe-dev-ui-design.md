# fe-dev:ui Skill Design

## Overview

Design-to-code skill for the fe-dev plugin. Converts MasterGo design mockups into actual Vue3 + Element Plus page code with project context awareness.

## Scope

- Target stack: Nuxt4 + Vue3 + TypeScript + Element Plus + Tailwind CSS + SCSS
- Design source: MasterGo only (extensible interface reserved for future sources)
- Integration: Embeds into existing feat workflow (after feat-req, before feat-exec)

## Pain Points

1. `getDsl` returns massive node trees, hard to extract key information
2. `getD2c` is unreliable (actual 404 errors observed)
3. Generated code lacks project context (types, useXxxService, UI component conventions)
4. No tracking of which design pages have been converted
5. No mechanism to sync when design mockups change

## Architecture

### File Structure

```
fe-dev/skills/
├── ui/SKILL.md              # Entry: list / update / check routing
├── ui-add/SKILL.md          # Analyze design mockup, generate spec
├── ui-gen/SKILL.md          # Generate code from spec + project context

fe-dev/templates/
├── ui-pages.json            # Page registry template
├── design-spec.md           # Design specification template

fe-dev/references/
├── ui-utils.md              # Shared utilities (paths, status enum, MCP conventions)
```

### Data Flow

```
MasterGo URL
     │
     ▼
  ui-add ─── getD2c / getDsl (two-step fallback, no image analysis)
     │
     ▼
  design-spec.md (semantic tokens + layout + component list + field mapping)
  ui-pages.json (status updated to spec-done)
     │
     ▼
  User reviews/edits spec
     │
     ▼
  ui-gen ─── reads spec + scans types/services + references existing pages
     │
     ▼
  .vue file (Element Plus + Tailwind + Scoped SCSS)
  ui-pages.json (status updated to converted)
     │
     ▼
  ui check ─── optional quality check (ui-ux-pro-max checklist)
```

### Command Matrix

| Command | Input | Output | Status Change |
|---------|-------|--------|---------------|
| `/fe-dev:ui-add <url> <name>` | MasterGo URL + page name | spec + ui-pages.json | -> spec-done |
| `/fe-dev:ui-gen [page-id]` | spec + project context | .vue file | -> converted |
| `/fe-dev:ui` (list) | None | Status table | None |
| `/fe-dev:ui update <page-id>` | MasterGo URL (new/same) | Diff spec | -> spec-done |
| `/fe-dev:ui check [page-id]` | .vue file | Issue list | -> reviewed |

### Status Flow

`pending` -> `spec-done` -> `converted` -> `reviewed`

---

## Section 1: ui-pages.json

### Location

```
apps/frontend/docs/features/feat-{name}/ui/ui-pages.json
```

Follows feature lifecycle, lives inside feature directory.

### Structure

```json
{
  "$schema": "ui-pages",
  "pages": [
    {
      "id": "login",
      "name": "login",
      "mastergo": "https://mastergo.iflytek.com/goto/RuscHDVn",
      "target": "pages/login/index.vue",
      "status": "spec-done",
      "createdAt": "2026-03-20",
      "updatedAt": "2026-03-20",
      "tokens": {
        "element-plus": { "--el-color-primary": "#02B3D6" },
        "tailwind": { "colors.brand": "#02B3D6" },
        "scoped": {}
      }
    }
  ]
}
```

---

## Section 2: design-spec.md

### Location

```
apps/frontend/docs/features/feat-{name}/ui/specs/{pageId}-spec.md
```

### Template

```markdown
# Design Spec: {pageId}

## Source
- MasterGo: {url}
- Extracted at: {date}

## Design Tokens

### Element Plus Theme
| Variable | Value | Description |
|----------|-------|-------------|
| --el-color-primary | #02B3D6 | Brand primary |

### Tailwind Extensions
| Variable | Value | Description |
|----------|-------|-------------|
| colors.brand | #02B3D6 | Brand color |
| borderRadius.card | 24px | Card radius |

### Scoped SCSS
| Variable | Value | Description |
|----------|-------|-------------|
| --shadow-card | 0px 20px 25px... | Card shadow |

## Layout Structure
{Describe overall layout: left-right split / top nav + content / dialog, etc.}

## Component List
| Area | Element Plus Component | Tailwind Styles | Description |
|------|----------------------|-----------------|-------------|
| Search bar | ElInput, ElButton | flex, gap-4 | Keyword + status filter |
| Data area | ElTable | w-full | Paginated table |
| Action col | ElButton(text) | - | View/Edit/Delete |

## Field Mapping
| Field Name | Type | EP Component | Validation | Related Type |
|------------|------|-------------|------------|--------------|
| username | string | ElInput | required | LoginFormModel.username |

## Interaction Description
| Interaction | Trigger | Behavior |
|-------------|---------|----------|
| Login | Click login button | Validate -> call useAuthService.login -> redirect |

## Project Context
- types: [auto-discovered or manual]
- services: [auto-discovered or manual]
- reference: [reference page path]
```

### Token Grouping Strategy

Tokens are extracted as semantic tokens (not raw DSL values), grouped by target layer:

- **Element Plus Theme**: Colors, border-radius that map to `--el-*` CSS variables
- **Tailwind Extensions**: Spacing, sizing, colors that extend tailwind.config
- **Scoped SCSS**: Decorative values (gradients, shadows, animations) used only in one page

### Context Discovery

`ui-add` auto-discovers project context:
- `grep` for interface/type matching field names from spec
- `grep` for useXxxService matching business scenario from spec
- Find existing pages of same type as reference

---

## Section 3: ui-add Workflow

### Execution Flow

1. Parse arguments (MasterGo URL + page name + optional target-path)
2. Auto-detect current feature (extract from git branch)
3. Initialize ui/ directory and ui-pages.json if not exists
4. Fetch design data (two-step fallback):
   a. Try `getD2c` (best)
   b. Try `getDsl` (structured data)
   c. If both fail -> report error and stop
5. AI analyzes design data, generates design-spec.md:
   - Extract tokens -> group by three layers (EP / Tailwind / SCSS)
   - Identify layout structure
   - Map components (design elements -> Element Plus components)
   - Extract fields and validation rules
   - Describe interaction behaviors
6. Auto-discover project context:
   - grep interface/type matching field names
   - grep useXxxService matching business scenario
   - Find similar existing pages as reference
7. Write spec + update ui-pages.json (status: spec-done)
8. Output summary, prompt user to review spec

### MCP Call Convention

```yaml
# MasterGo-specific strategy (no image analysis fallback)
fetch-strategies:
  - name: d2c
    mcp: mastergo
    tool: getD2c
    extract: [contentId, documentId] from URL
    fallback: dsl

  - name: dsl
    mcp: mastergo
    tool: getDsl
    params: { shortLink: url }
    fallback: none  # Fail and exit if both fail

# Reserved: future non-MasterGo sources
# - name: image
#   mcp: 4_5v_mcp
#   tool: analyze_image
#   condition: source != "mastergo"
```

---

## Section 4: ui-gen Workflow

### Execution Flow

1. Auto-detect current feature
2. Read ui-pages.json, auto-select if only one spec-done page exists
3. Read corresponding design-spec.md
4. Scan project context:
   a. types: grep interface/type matching spec field names
   b. services: grep useXxxService matching spec interaction description
   c. reference: read the reference page file specified in spec
   d. variables.css: read existing Element Plus / Tailwind variables
5. Generate code (following code generation rules below)
6. Write .vue file (overwrite or create)
7. Handle tokens:
   a. Compare spec tokens with existing variables.css
   b. Show diff, prompt user to confirm merge
   c. Write to corresponding variable files after confirmation
8. Update ui-pages.json (status: converted)
9. Optional: run ui check

### Code Generation Rules

Priority (high to low):

1. **Components**: Prefer Element Plus components
   - Forms -> ElForm / ElFormItem / ElInput / ElSelect / ElDatePicker
   - Data display -> ElTable / ElTableColumn / ElPagination
   - Feedback -> ElDialog / ElMessageBox / ElMessage / ElNotification
   - Navigation -> ElMenu / ElBreadcrumb / ElTabs
   - General -> ElButton / ElCard / ElTag / ElBadge / ElTooltip

2. **Styles**: Prefer Tailwind CSS classes
   - Layout -> flex / grid / gap-* / p-* / m-* / w-* / h-*
   - Spacing -> space-x-* / space-y-* / p-* / m-*
   - Responsive -> sm: / md: / lg: / xl:
   - Text -> text-* / font-* / leading-*
   - Display -> hidden / block / flex / grid

3. **Overrides**: scoped SCSS (only for these scenarios)
   - Element Plus component style overrides (must use :deep())
   - Decorative styles (gradient backgrounds, blur effects, animations)
   - CSS variable definitions (--shadow-card, etc.)

4. **Prohibited**
   - Inline style (style="...")
   - Global SCSS (no scoped)
   - !important (unless overriding EP third-party styles with no alternative)

### Generated Code Template

```vue
<template>
  <!-- Tailwind layout classes -->
  <div class="flex min-h-screen">
    <!-- Element Plus components -->
    <el-form ref="formRef" :model="formModel" :rules="formRules">
      <el-form-item prop="username">
        <el-input v-model="formModel.username" placeholder="..." />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
// Auto-imported project types
import type { XxxModel } from '~/types/xxx'
// Auto-discovered project services
import { useXxxService } from '~/composables/useXxxService'

const formModel = ref<XxxModel>({ ... })
// ... business logic
</script>

<style scoped lang="scss">
// Only :deep() overrides + decorative styles
:deep(.el-input__wrapper) {
  border-radius: var(--radius-input);
}
</style>
```

---

## Section 5: ui update (Diff Update)

### Execution Flow

1. Read existing design-spec.md
2. Fetch new design data (two-step fallback, same as ui-add)
3. AI compares old and new designs, generates diff report:
   - Layout changes
   - Token value changes
   - Component additions/removals
   - Field changes
   - Interaction changes
4. User confirms diff (AskUserQuestion: accept all / select items / cancel)
5. Update spec + ui-pages.json (status: spec-done, updatedAt: new timestamp)
6. Prompt user to re-run ui-gen

### Comparison Dimensions

| Dimension | Detection |
|-----------|-----------|
| Layout | Overall structure change (split direction, area add/remove) |
| Tokens | Color, border-radius, font, shadow value changes |
| Components | Element Plus component add/remove |
| Fields | Form field add/remove, type change, validation change |
| Interactions | Action button, navigation logic change |

---

## Section 6: ui check (Quality Check)

### Execution Flow

1. Read ui-pages.json for pages with status=converted
2. Read each generated .vue file
3. Scan against quality rules
4. Output issue list (sorted by severity: error / warning / info)
5. No errors -> update ui-pages.json (status: reviewed)

### Quality Rules

From ui-ux-pro-max Pre-Delivery Checklist (condensed):

- No inline style
- Clickable elements have cursor-pointer (Tailwind class)
- hover/transition exists and within 150-300ms range
- Text contrast ratio >= 4.5:1 (calculated from token color values)
- Element Plus components used correctly (no manual reimplementation)
- scoped SCSS has no global style leakage
- Form fields have label or aria-label

Plus project-specific rules:

- Element Plus first
- Tailwind preferred over SCSS
- scoped no leakage

---

## Section 7: ui (Entry) Routing

```bash
/fe-dev:ui              -> list (default, show all page statuses)
/fe-dev:ui list         -> list
/fe-dev:ui update <id>  -> update
/fe-dev:ui check [id]   -> check (no id = check all converted pages)
```

---

## Section 8: ui-utils.md

### Shared Utilities

```markdown
# UI Skill Shared Utilities

## Path Conventions

UI_DIR = docs/features/feat-{featName}/ui/
PAGES_JSON = {UI_DIR}/ui-pages.json
SPECS_DIR = {UI_DIR}/specs/
specPath(pageId) = {SPECS_DIR}/{pageId}-spec.md

## Status Enum

type PageStatus = "pending" | "spec-done" | "converted" | "reviewed"
statusFlow: pending -> spec-done -> converted -> reviewed

## Feature Detection

getFeatName():
  branch = git branch --show-current
  return branch.replace("feat/", "")

getUIDir():
  return "docs/features/feat-{getFeatName()}/ui/"

## ui-pages.json Operations

initPagesJson(featName): Create initial file if not exists
getPage(pagesJson, pageId): Find page record by pageId
updatePageStatus(pagesJson, pageId, status): Update status + updatedAt

## MCP Call Convention

fetchDesignData(url):
  Priority: getD2c > getDsl > fail (no image analysis for MasterGo)

## Code Generation Rules

stylePriority:
  1. Element Plus components
  2. Tailwind CSS classes
  3. Scoped SCSS (:deep() + decorative only)
  4. Prohibited: inline style
```

---

## Section 9: feat Workflow Integration

```
feat-new          Create feature branch and directory
    |
feat-req          Sync requirements document
    |
+---+------------------------------+
|  ui-add   Analyze design -> spec |  NEW
|  ui-gen   spec -> .vue code      |  NEW
|  ui check Optional QC            |  NEW
+---+------------------------------+
    |
feat-gen          Generate dev plan (can reference ui/ specs)
    |
feat-exec         Execute dev tasks
    |
feat-done         Mark complete
```

### feat-gen Integration

When `feat-gen` detects `ui/` directory exists with spec-done or converted pages:

Auto-reference in plan.md:
- Page design spec: ui/specs/{pageId}-spec.md
- Page registry: ui/ui-pages.json
- Generated code files: {target} (if already converted)

### Files to Modify

| File | Change |
|------|--------|
| `skills/index/SKILL.md` | Add ui commands to index table |
| `references/feat-utils.md` | Add getUIDir() path utility |
| `CLAUDE.md` | Add ui entries to file structure |
| `README.md` | Add ui commands to reference table |

### Files NOT Modified

- `templates/feat-index.md` - No intrusion into existing templates
- `templates/feat-plan.md` - feat-gen auto-detects ui/ directory
- Other feat-* SKILL.md - Fully independent, no coupling

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Nuxt4 + Element Plus only | Deep customization possible, no abstraction tax |
| Design source | MasterGo only (extensible) | Current need, reserved interface for future |
| Code generation | Full page generation | User confirmed, covers template + script + style |
| Token management | AI suggests semantic tokens + user confirms | Balance of speed and accuracy |
| Styling layers | EP > Tailwind > scoped SCSS, no inline | User-defined constraint |
| File location | Inside feature directory | Follows feat lifecycle |
| Design update | Diff-based (intelligent) | User chose smart update over full reset |
| MCP fallback | getD2c > getDsl > fail | No image analysis for MasterGo |
| ui-ux-pro-max | Optional post-gen QC only | Design already exists, no need for design generation |
| Skill structure | Hybrid (option C) | ui-add/ui-gen independent, rest routed through ui |

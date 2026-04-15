#!/usr/bin/env node
/**
 * MasterGo DSL Parser v6.0.0
 *
 * 用法:
 *   node dsl-parser.mjs resources <dsl_raw.json> [output.json]   — 提取资源清单（含 SVG markup + stroke）
 *   node dsl-parser.mjs tokens <dsl_raw.json> [output.json]      — 提取 design tokens（含 rgba/渐变/textSegments）
 *   node dsl-parser.mjs tailwind-map <tailwind.config.*> [output.json] — 生成 Tailwind 值→class 映射表
 *   node dsl-parser.mjs export-svgs <resources.json> <output-dir>     — 批量导出 SVG 文件到目录
 *   node dsl-parser.mjs fetch-svgs <resources.json> <output-dir> --pat <pat> --base-url <url> --file-id <id>
 *                                                                     — 逐节点请求 DSL 后精确重建 SVG
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve as pathResolve, extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execSync } from 'node:child_process'

const VERSION = '6.3.0'

// SVG 相关节点类型
const SVG_SHAPE_TYPES = new Set(['PATH', 'SVG_ELLIPSE', 'SVG_RECT', 'SVG_POLYGON', 'SVG_LINE'])
const SVG_GROUP_TYPES = new Set(['SVG_GROUP', 'BOOLEAN_OPERATION'])
const SVG_ALL_TYPES = new Set([...SVG_SHAPE_TYPES, ...SVG_GROUP_TYPES])

// ─── 工具函数 ──────────────────────────────────────────────────

function loadDsl(path) {
  if (!existsSync(path)) {
    console.error(`Error: 文件不存在: ${path}`)
    process.exit(1)
  }
  const dsl = JSON.parse(readFileSync(path, 'utf-8'))
  if (!dsl.nodes) {
    console.error("Error: DSL 缺少 'nodes' 字段")
    process.exit(1)
  }
  return dsl
}

function resolveStyleRef(dsl, refKey) {
  const styles = dsl.styles || {}
  const entry = styles[refKey]
  if (!entry) return { token: refKey, value: null }
  const value = entry.value
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0]
    if (typeof first === 'string' && first.trim()) return { token: refKey, value: first.trim() }
    if (typeof first === 'object' && first !== null) return { token: refKey, value: first }
  }
  if (typeof value === 'string' && value.trim()) return { token: refKey, value: value.trim() }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return { token: refKey, value }
  return { token: refKey, value: null }
}

/** 检查节点是否可见（visible: false、opacity: 0、尺寸接近 0 的节点跳过） */
function isNodeVisible(node) {
  if (node.visible === false) return false
  if (node.opacity === 0) return false
  const layout = node.layoutStyle || {}
  if (layout.width != null && layout.height != null && layout.width < 1 && layout.height < 1) return false
  return true
}

/** 标准化颜色值为小写 hex，支持 #hex、#hexAlpha、rgba()、rgb() */
function normalizeColor(color) {
  if (!color) return null
  if (typeof color !== 'string') return null
  color = color.trim()
  // Standard hex (#RGB, #RRGGBB, #RRGGBBAA)
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return color.toLowerCase()
  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')
    const a = rgbaMatch[4] != null ? Math.round(parseFloat(rgbaMatch[4]) * 255).toString(16).padStart(2, '0') : ''
    return `#${r}${g}${b}${a === 'ff' ? '' : a}`
  }
  return null
}

function resolveFillColor(dsl, node) {
  let fill = node.fill
  // MasterGo PATH 节点的 fill 存在 path[0].fill 而非 node.fill
  if (!fill && node.type === 'PATH') {
    const pathField = node.path
    if (Array.isArray(pathField) && pathField.length > 0 && pathField[0].fill) {
      fill = pathField[0].fill
    } else if (typeof pathField === 'object' && pathField !== null && !Array.isArray(pathField) && pathField.fill) {
      fill = pathField.fill
    }
  }
  if (!fill) return null

  if (typeof fill === 'string' && fill.startsWith('#')) {
    return { value: fill }
  }
  if (typeof fill === 'string' && (fill.startsWith('paint_') || fill.startsWith('effect_'))) {
    const ref = resolveStyleRef(dsl, fill)
    // 图片 URL 对象
    if (ref.value && typeof ref.value === 'object' && ref.value.url) {
      return { type: 'image', url: ref.value.url, token: ref.token }
    }
    // 字符串值（颜色、渐变等）
    if (ref.value && typeof ref.value === 'string') return ref
    return null
  }
  // 渐变对象（非数组）
  if (typeof fill === 'object' && !Array.isArray(fill) && fill.type === 'gradient') {
    return { type: 'gradient', value: fill }
  }
  if (Array.isArray(fill) && fill.length > 0) {
    const first = fill[0]
    if (typeof first === 'string' && first.startsWith('#')) {
      return { value: first }
    }
    if (typeof first === 'string' && (first.startsWith('paint_') || first.startsWith('effect_'))) {
      return resolveStyleRef(dsl, first)
    }
    // 渐变对象在数组中
    if (typeof first === 'object' && first !== null && first.type === 'gradient') {
      return { type: 'gradient', value: first }
    }
    if (typeof first === 'string') {
      return { value: first }
    }
    // 图片 fill
    if (typeof first === 'object' && first !== null && first.url) {
      return { type: 'image', url: first.url }
    }
  }
  return null
}

/** 解析节点的 stroke 信息 */
function resolveStroke(dsl, node) {
  const stroke = node.stroke
  // MasterGo DSL 也可能用 strokeColor + strokeWidth 分开存储
  if (!stroke && node.strokeColor) {
    const colorRef = node.strokeColor
    let color = colorRef
    if (typeof colorRef === 'string' && (colorRef.startsWith('paint_') || colorRef.startsWith('effect_'))) {
      const resolved = resolveStyleRef(dsl, colorRef)
      color = (resolved.value && typeof resolved.value === 'string') ? resolved.value : colorRef
    }
    const widthStr = node.strokeWidth
    const width = widthStr ? parseFloat(String(widthStr).replace('px', '')) : null
    return { color, width, lineCap: node.strokeLineCap || null, lineJoin: node.strokeLineJoin || null, dasharray: null }
  }
  if (!stroke) return null
  if (typeof stroke === 'string' && stroke.startsWith('#')) {
    return { color: stroke }
  }
  if (typeof stroke === 'string' && (stroke.startsWith('paint_') || stroke.startsWith('effect_'))) {
    const resolved = resolveStyleRef(dsl, stroke)
    return resolved.value && typeof resolved.value === 'string' ? { color: resolved.value } : null
  }
  if (typeof stroke === 'object' && stroke !== null) {
    let color = stroke.color
    if (typeof color === 'string' && (color.startsWith('paint_') || color.startsWith('effect_'))) {
      const resolved = resolveStyleRef(dsl, color)
      color = resolved.value || color
    }
    return {
      color: color || null,
      width: stroke.width ?? stroke.strokeWeight ?? null,
      lineCap: stroke.lineCap || null,
      lineJoin: stroke.lineJoin || null,
      dasharray: stroke.dasharray || null,
    }
  }
  return null
}

/** 构建 SVG stroke 属性字符串 */
function buildStrokeAttrs(strokeInfo) {
  if (!strokeInfo) return ''
  const parts = []
  if (strokeInfo.color) parts.push(`stroke="${strokeInfo.color}"`)
  if (strokeInfo.width) parts.push(`stroke-width="${strokeInfo.width}"`)
  if (strokeInfo.lineCap) parts.push(`stroke-linecap="${strokeInfo.lineCap}"`)
  if (strokeInfo.lineJoin) parts.push(`stroke-linejoin="${strokeInfo.lineJoin}"`)
  if (strokeInfo.dasharray) parts.push(`stroke-dasharray="${strokeInfo.dasharray}"`)
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}

function getNodeBounds(node) {
  const layout = node.layoutStyle || {}
  const x = layout.x ?? layout.left
  const y = layout.y ?? layout.top
  const w = layout.width
  const h = layout.height
  if (w != null && h != null) {
    return {
      x: x != null ? Math.round(x * 10) / 10 : 0,
      y: y != null ? Math.round(y * 10) / 10 : 0,
      width: Math.round(w * 10) / 10,
      height: Math.round(h * 10) / 10,
    }
  }
  return null
}

function toPascalCase(name) {
  if (!name) return 'Unnamed'
  name = name.replace(/^[^\w]+/, '').replace(/^_/, '')
  if (!name) return 'Unnamed'
  return name
    .split(/[_\-\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}

/** 生成语义化名称，降级策略：node.name → 父名+类型 → Type_id */
function getSemanticName(node, parentName = '') {
  const name = node.name || ''
  const pascal = toPascalCase(name)
  // 结果只有数字、太短、或 Unnamed → 尝试用父名+类型
  if (/^\d+$/.test(pascal) || pascal.length <= 2 || pascal === 'Unnamed') {
    if (parentName) {
      const parentPascal = toPascalCase(parentName)
      const typeSuffix = (node.type || '').replace(/^SVG_/, '').toLowerCase()
      if (parentPascal !== 'Unnamed' && !/^\d+$/.test(parentPascal)) {
        return `${parentPascal}${typeSuffix ? typeSuffix.charAt(0).toUpperCase() + typeSuffix.slice(1) : ''}`
      }
    }
    const typePrefix = (node.type || 'Node').replace(/^SVG_/, '')
    return node.id ? `${typePrefix}_${node.id.replace(/:/g, '_')}` : typePrefix
  }
  return pascal
}

/** 判断是否为 SVG 子树（含 FRAME/LAYER 包裹的纯 SVG 形状组） */
function isSvgSubtree(node) {
  const nodeType = node.type || ''
  if (SVG_GROUP_TYPES.has(nodeType)) return true
  const children = node.children || []
  if (children.length === 0) return false

  // FRAME/LAYER 容器：如果尺寸远大于子节点，说明是布局容器而非 SVG 图标
  // 例如 icon-wrapper-16px (40x64) 包含 16x16 的实际图标
  if ((nodeType === 'FRAME' || nodeType === 'LAYER') && children.length === 1) {
    const parentW = node.layoutStyle?.width || 0
    const parentH = node.layoutStyle?.height || 0
    const childW = children[0].layoutStyle?.width || 0
    const childH = children[0].layoutStyle?.height || 0
    if (parentW > 0 && childW > 0 && parentH > 0 && childH > 0) {
      const areaRatio = (parentW * parentH) / (childW * childH)
      // 容器面积超过子节点 4 倍 → 是布局容器，递归处理子节点
      if (areaRatio > 4) return false
    }
  }

  // 子节点全是 SVG 形状类型 → 是 SVG 子树
  if (children.every((child) => SVG_ALL_TYPES.has(child.type || ''))) return true
  // 子节点全是 SVG 形状 + PATH + LAYER（纯色矩形底色）→ 也是 SVG 子树（图标组合）
  const svgLikeTypes = new Set([...SVG_ALL_TYPES, 'LAYER'])
  return children.every((child) => {
    const ct = child.type || ''
    if (svgLikeTypes.has(ct)) return true
    // FRAME 子节点如果其子节点全是 SVG 形状，也算
    if (ct === 'FRAME' && (child.children || []).length > 0) {
      return (child.children || []).every(gc => SVG_ALL_TYPES.has(gc.type || '') || gc.type === 'LAYER')
    }
    return false
  })
}

// ─── SVG 子形状收集 ──────────────────────────────────────────────

function collectSvgChildren(dsl, node, parentType = '') {
  const shapes = []
  const nodeType = node.type || ''

  // 跳过不可见节点
  if (!isNodeVisible(node)) return shapes

  // BOOLEAN_OPERATION — 合并所有子 path 为单个 compound path
  if (nodeType === 'BOOLEAN_OPERATION') {
    const allPaths = []
    function collectPaths(n) {
      if (!isNodeVisible(n)) return
      const t = n.type || ''
      if (t === 'PATH') {
        const pf = n.path || {}
        let pd = ''
        if (Array.isArray(pf) && pf.length > 0) pd = pf[0].data || ''
        else if (typeof pf === 'object') pd = pf.data || ''
        if (pd) allPaths.push(pd)
      }
      for (const c of n.children || []) collectPaths(c)
    }
    collectPaths(node)
    if (allPaths.length > 0) {
      shapes.push({
        shape: 'path',
        path_data: allPaths.join(' '),
        fill: resolveFillColor(dsl, node) || resolveFillColor(dsl, node.children?.[0]),
        stroke: resolveStroke(dsl, node),
        bounds: getNodeBounds(node),
        fillRule: 'evenodd',
      })
    }
    return shapes // 不再递归，子 path 已合并
  }

  // 提取节点在父容器中的相对位置（用于 SVG 组内子形状定位）
  const layout = node.layoutStyle || {}
  const relPos = {
    x: Math.round((layout.relativeX ?? 0) * 10) / 10,
    y: Math.round((layout.relativeY ?? 0) * 10) / 10,
  }

  if (nodeType === 'PATH') {
    const pathField = node.path || {}
    let pathData = ''
    if (Array.isArray(pathField) && pathField.length > 0) {
      pathData = pathField[0].data || ''
    } else if (typeof pathField === 'object') {
      pathData = pathField.data || ''
    }
    const fillInfo = resolveFillColor(dsl, node)
    const strokeInfo = resolveStroke(dsl, node)
    if (pathData || fillInfo || strokeInfo) {
      shapes.push({ shape: 'path', path_data: pathData, fill: fillInfo, stroke: strokeInfo, bounds: getNodeBounds(node), relPos })
    }
  } else if (nodeType === 'SVG_POLYGON') {
    // 提取 polygon 的 points 数据
    let points = ''
    const pathField = node.path || {}
    if (typeof pathField === 'string') {
      points = pathField
    } else if (Array.isArray(pathField) && pathField.length > 0) {
      // 可能存储为 path data，也可以作为 polygon points
      points = pathField[0].data || pathField[0].points || ''
    } else if (typeof pathField === 'object') {
      points = pathField.data || pathField.points || ''
    }
    // 也检查 node.points
    if (!points && node.points) {
      const pts = node.points
      if (typeof pts === 'string') {
        points = pts
      } else if (Array.isArray(pts)) {
        points = pts.map(p => `${p.x ?? p[0]},${p.y ?? p[1]}`).join(' ')
      }
    }
    shapes.push({
      shape: 'polygon',
      points,
      fill: resolveFillColor(dsl, node),
      stroke: resolveStroke(dsl, node),
      bounds: getNodeBounds(node),
      relPos,
    })
  } else if (nodeType === 'LAYER') {
    // LAYER 作为 SVG 子形状时当作矩形处理（图标中的纯色底色块）
    const fillInfo = resolveFillColor(dsl, node)
    if (fillInfo && fillInfo.type !== 'image') {
      shapes.push({
        shape: 'rect',
        fill: fillInfo,
        stroke: resolveStroke(dsl, node),
        bounds: getNodeBounds(node),
        relPos,
      })
    }
  } else if (['SVG_ELLIPSE', 'SVG_RECT', 'SVG_LINE'].includes(nodeType)) {
    const shapeMap = { SVG_ELLIPSE: 'ellipse', SVG_RECT: 'rect', SVG_LINE: 'line' }
    shapes.push({
      shape: shapeMap[nodeType],
      fill: resolveFillColor(dsl, node),
      stroke: resolveStroke(dsl, node),
      bounds: getNodeBounds(node),
      relPos,
    })
  }

  for (const child of node.children || []) {
    shapes.push(...collectSvgChildren(dsl, child))
  }
  return shapes
}

// ─── 资源提取 ──────────────────────────────────────────────────

function extractResources(dsl, node, parentId = '', parentName = '') {
  const resources = []

  // 跳过不可见节点
  if (!isNodeVisible(node)) return resources

  const nodeId = node.id || ''
  const nodeType = node.type || ''
  const name = node.name || ''
  const semanticName = getSemanticName(node, parentName)

  // LAYER + 图片 fill
  if (nodeType === 'LAYER') {
    const fill = node.fill
    // fill 是 paint_ 引用 → 先解析
    if (typeof fill === 'string' && fill.startsWith('paint_')) {
      const ref = resolveStyleRef(dsl, fill)
      if (ref.value && typeof ref.value === 'object' && ref.value.url) {
        resources.push({
          node_id: nodeId, semantic_name: semanticName, type: nodeType,
          resource_type: 'image', url: ref.value.url, bounds: getNodeBounds(node), parent_id: parentId,
        })
      }
    } else if (Array.isArray(fill)) {
      for (const f of fill) {
        if (typeof f === 'object' && f !== null && f.url) {
          resources.push({
            node_id: nodeId, semantic_name: semanticName, type: nodeType,
            resource_type: 'image', url: f.url, bounds: getNodeBounds(node), parent_id: parentId,
          })
          break
        } else if (typeof f === 'string' && f.startsWith('paint_')) {
          const ref = resolveStyleRef(dsl, f)
          if (ref.value && typeof ref.value === 'object' && ref.value.url) {
            resources.push({
              node_id: nodeId, semantic_name: semanticName, type: nodeType,
              resource_type: 'image', url: ref.value.url, bounds: getNodeBounds(node), parent_id: parentId,
            })
            break
          }
        }
      }
    }
  }
  // SVG 组 — 合并子形状为单个 SVG 资源
  else if (isSvgSubtree(node) && (node.children || []).length > 0) {
    const childrenShapes = collectSvgChildren(dsl, node)
    if (childrenShapes.length > 0) {
      resources.push({
        node_id: nodeId, semantic_name: semanticName, type: 'SVG_GROUP',
        resource_type: 'svg', children: childrenShapes, bounds: getNodeBounds(node), parent_id: parentId,
      })
      return resources // 不再递归，子节点已合并
    }
  }
  // 单独的 PATH
  else if (nodeType === 'PATH') {
    const pathField = node.path || {}
    let pathData = ''
    if (Array.isArray(pathField) && pathField.length > 0) {
      pathData = pathField[0].data || ''
    } else if (typeof pathField === 'object') {
      pathData = pathField.data || ''
    }
    const fillInfo = resolveFillColor(dsl, node)
    const strokeInfo = resolveStroke(dsl, node)
    const bounds = getNodeBounds(node)
    if (pathData || fillInfo || strokeInfo) {
      resources.push({
        node_id: nodeId, semantic_name: semanticName, type: nodeType,
        resource_type: 'svg', path_data: pathData, fill: fillInfo, stroke: strokeInfo, bounds, parent_id: parentId,
      })
    }
  }
  // SVG_POLYGON
  else if (nodeType === 'SVG_POLYGON') {
    let points = ''
    const pathField = node.path || {}
    if (typeof pathField === 'string') {
      points = pathField
    } else if (Array.isArray(pathField) && pathField.length > 0) {
      points = pathField[0].data || pathField[0].points || ''
    } else if (typeof pathField === 'object') {
      points = pathField.data || pathField.points || ''
    }
    if (!points && node.points) {
      const pts = node.points
      if (typeof pts === 'string') points = pts
      else if (Array.isArray(pts)) points = pts.map(p => `${p.x ?? p[0]},${p.y ?? p[1]}`).join(' ')
    }
    resources.push({
      node_id: nodeId, semantic_name: semanticName, type: nodeType,
      resource_type: 'svg', points, fill: resolveFillColor(dsl, node), stroke: resolveStroke(dsl, node),
      bounds: getNodeBounds(node), parent_id: parentId,
    })
  }
  // 其他 SVG 形状
  else if (['SVG_ELLIPSE', 'SVG_RECT', 'SVG_LINE'].includes(nodeType)) {
    resources.push({
      node_id: nodeId, semantic_name: semanticName, type: nodeType,
      resource_type: 'svg', fill: resolveFillColor(dsl, node), stroke: resolveStroke(dsl, node),
      bounds: getNodeBounds(node), parent_id: parentId,
    })
  }

  // 递归子节点
  for (const child of node.children || []) {
    resources.push(...extractResources(dsl, child, nodeId, name))
  }
  return resources
}

// ─── 输出格式化 ──────────────────────────────────────────────────

function compactFill(fillInfo) {
  if (!fillInfo) return null
  if (fillInfo.type === 'gradient') return { type: 'gradient', value: fillInfo.value }
  if (fillInfo.type === 'image') return { type: 'image', url: fillInfo.url }
  if (fillInfo.token) return { token: fillInfo.token, value: fillInfo.value }
  return fillInfo.value ?? null
}

function compactStroke(strokeInfo) {
  if (!strokeInfo) return undefined
  const s = {}
  if (strokeInfo.color) s.color = strokeInfo.color
  if (strokeInfo.width) s.width = strokeInfo.width
  if (strokeInfo.lineCap) s.lineCap = strokeInfo.lineCap
  if (strokeInfo.lineJoin) s.lineJoin = strokeInfo.lineJoin
  if (strokeInfo.dasharray) s.dasharray = strokeInfo.dasharray
  return Object.keys(s).length > 0 ? s : undefined
}

function compactResource(r) {
  const compact = {
    node_id: r.node_id,
    semantic_name: r.semantic_name,
    resource_type: r.resource_type,
  }
  if (r.url) compact.url = r.url
  if (r.path_data) compact.path_data = r.path_data
  if (r.fillRule) compact.fillRule = r.fillRule
  if (r.points) compact.points = r.points
  if (r.fill) compact.fill = compactFill(r.fill)
  const stroke = compactStroke(r.stroke)
  if (stroke) compact.stroke = stroke

  // SVG_GROUP — 子形状
  if (r.children) {
    compact.children = r.children.map((child) => {
      const c = { shape: child.shape }
      if (child.path_data) c.path_data = child.path_data
      if (child.fillRule) c.fillRule = child.fillRule
      if (child.points) c.points = child.points
      if (child.fill) c.fill = compactFill(child.fill)
      const cs = compactStroke(child.stroke)
      if (cs) c.stroke = cs
      if (child.bounds) c.size = `${Math.round(child.bounds.width)}x${Math.round(child.bounds.height)}`
      return c
    })
  }

  if (r.bounds) compact.size = `${Math.round(r.bounds.width)}x${Math.round(r.bounds.height)}`
  if (r.svg_markup) compact.svg_markup = r.svg_markup
  return compact
}

// ─── 资源去重 ──────────────────────────────────────────────────

function deduplicateResources(resources) {
  const seen = new Map()
  return resources.filter(r => {
    let key
    if (r.resource_type === 'image') {
      key = `img:${r.url || r.node_id}`
    } else if (r.resource_type === 'svg') {
      if (r.path_data) {
        key = `svg:path:${r.path_data}`
      } else if (r.children) {
        key = `svg:group:${r.children.map(c => c.path_data || c.points || c.shape).join('|')}`
      } else if (r.points) {
        key = `svg:polygon:${r.points}`
      } else {
        key = `svg:${r.node_id}`
      }
    } else {
      key = r.node_id
    }
    if (seen.has(key)) return false
    seen.set(key, true)
    return true
  })
}

// ─── Tokens 提取 ──────────────────────────────────────────────

/** 从 MasterGo font style 字符串中提取 fontWeight */
function extractFontWeight(styleStr) {
  if (!styleStr) return null
  // 简单字符串：直接是字重名如 "Regular"、"Medium"、"Bold"
  if (typeof styleStr === 'string' && !styleStr.startsWith('{')) {
    const simpleMap = {
      'Thin': 'w100', 'ExtraLight': 'w200', 'Light': 'w300',
      'Regular': 'w400', 'Medium': 'w500', 'SemiBold': 'w600', 'Bold': 'w700',
      'ExtraBold': 'w800', 'Black': 'w900',
    }
    return simpleMap[styleStr] || null
  }
  try {
    const obj = typeof styleStr === 'string' ? JSON.parse(styleStr) : styleStr
    if (obj.wght) return `w${obj.wght}`
    const name = obj.fontStyle || ''
    const weightMap = {
      '极细体': 'w100', '细体': 'w300', '常规体': 'w400', '中黑体': 'w500',
      '中粗体': 'w600', '粗体': 'w700', '特粗体': 'w800',
      'Thin': 'w100', 'ExtraLight': 'w200', 'Light': 'w300',
      'Regular': 'w400', 'Medium': 'w500', 'SemiBold': 'w600', 'Bold': 'w700',
      'ExtraBold': 'w800', 'Black': 'w900',
    }
    return weightMap[name] || null
  } catch { return null }
}

/** 解析 CSS box-shadow 字符串为结构化对象数组 */
function parseCssBoxShadow(css) {
  const results = []
  const regex = /box-shadow:\s*(inset\s+)?([\d.-]+)px\s+([\d.-]+)px\s+([\d.-]+)px\s+([\d.-]+)px\s+(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})/g
  for (const m of css.matchAll(regex)) {
    results.push({
      inset: !!m[1], x: parseFloat(m[2]), y: parseFloat(m[3]),
      blur: parseFloat(m[4]), spread: parseFloat(m[5]), color: m[6],
    })
  }
  return results
}

function addColor(tokens, color) {
  const normalized = normalizeColor(color)
  if (normalized) tokens.colors.add(normalized)
}

function extractTokens(dsl, node, tokens) {
  // 跳过不可见节点
  if (!isNodeVisible(node)) return

  const layout = node.layoutStyle || {}
  const flex = node.flexContainerInfo || {}
  const text = node.textStyle || {}

  // 颜色 — fill
  const fillColor = resolveFillColor(dsl, node)
  if (fillColor) {
    if (fillColor.type === 'gradient' && fillColor.value) {
      // 渐变：提取所有 stop 颜色
      const grad = fillColor.value
      if (Array.isArray(grad.stops)) {
        const gradientKey = `${grad.angle ?? 0}deg: ${grad.stops.map(s => `${s.color}@${Math.round((s.position ?? 0) * 100)}%`).join(', ')}`
        tokens.gradients.add(gradientKey)
        for (const stop of grad.stops) {
          addColor(tokens, stop.color)
        }
      }
    } else if (fillColor.value) {
      addColor(tokens, fillColor.value)
    }
  }

  // 颜色 — fill 数组中的渐变（兼容数组格式）
  const fill = node.fill
  if (Array.isArray(fill)) {
    for (const f of fill) {
      if (typeof f === 'object' && f !== null && f.type === 'gradient' && Array.isArray(f.stops)) {
        const gradientKey = `${f.angle ?? 0}deg: ${f.stops.map(s => `${s.color}@${Math.round((s.position ?? 0) * 100)}%`).join(', ')}`
        tokens.gradients.add(gradientKey)
        for (const stop of f.stops) {
          addColor(tokens, stop.color)
        }
      }
    }
  }

  // 颜色 — stroke
  const strokeInfo = resolveStroke(dsl, node)
  if (strokeInfo?.color) addColor(tokens, strokeInfo.color)

  // 颜色 — textStyle.color
  if (text.color) addColor(tokens, text.color)

  // 颜色 — textSegments（混合样式文本）
  if (Array.isArray(node.textSegments)) {
    for (const seg of node.textSegments) {
      if (seg.color) addColor(tokens, seg.color)
      if (seg.textStyle?.color) addColor(tokens, seg.textStyle.color)
      // 文本段的字体组合
      const segStyle = seg.textStyle || seg
      if (segStyle.fontSize) {
        const fontKey = [
          segStyle.fontSize && `${segStyle.fontSize}px`,
          segStyle.fontWeight && `w${segStyle.fontWeight}`,
          segStyle.lineHeight && `/${segStyle.lineHeight}px`,
        ].filter(Boolean).join(' ')
        if (fontKey) tokens.fonts.add(fontKey)
      }
    }
  }
  // 也检查 node.characters / node.styledTextSegments（MasterGo 可能用不同字段名）
  if (Array.isArray(node.styledTextSegments)) {
    for (const seg of node.styledTextSegments) {
      if (seg.fills) {
        for (const f of Array.isArray(seg.fills) ? seg.fills : [seg.fills]) {
          if (typeof f === 'string') addColor(tokens, f)
          else if (f?.color) addColor(tokens, f.color)
        }
      }
      if (seg.fontSize) {
        const fontKey = [
          `${seg.fontSize}px`,
          seg.fontWeight && `w${seg.fontWeight}`,
          seg.lineHeight && `/${seg.lineHeight}px`,
        ].filter(Boolean).join(' ')
        if (fontKey) tokens.fonts.add(fontKey)
      }
    }
  }

  // 字体组合 — node.textStyle（Figma 格式）
  if (text.fontSize) {
    const fontKey = [
      text.fontSize && `${text.fontSize}px`,
      text.fontWeight && `w${text.fontWeight}`,
      text.lineHeight && `/${text.lineHeight}px`,
    ].filter(Boolean).join(' ')
    if (fontKey) tokens.fonts.add(fontKey)
  }

  // 字体组合 — node.text 数组 + font 引用（MasterGo 格式）
  if (Array.isArray(node.text)) {
    for (const seg of node.text) {
      if (seg.font && typeof seg.font === 'string' && seg.font.startsWith('font_')) {
        const fontRef = resolveStyleRef(dsl, seg.font)
        if (fontRef.value && typeof fontRef.value === 'object') {
          const f = fontRef.value
          const fontKey = [
            f.size && `${f.size}px`,
            f.style ? extractFontWeight(f.style) : null,
            f.lineHeight && `/${f.lineHeight}px`,
          ].filter(Boolean).join(' ')
          if (fontKey) tokens.fonts.add(fontKey)
        }
      }
    }
  }

  // 颜色 — node.textColor 引用（MasterGo 格式）
  if (Array.isArray(node.textColor)) {
    for (const tc of node.textColor) {
      if (tc.color && typeof tc.color === 'string' && tc.color.startsWith('paint_')) {
        const colorRef = resolveStyleRef(dsl, tc.color)
        if (colorRef.value && typeof colorRef.value === 'string') {
          addColor(tokens, colorRef.value)
        }
      } else if (tc.color) {
        addColor(tokens, tc.color)
      }
    }
  }

  // 间距（统一转为数字，过滤不合理值）
  function addSpacing(val) {
    if (val == null) return
    if (typeof val === 'number') {
      if (val > 0 && val <= 200) tokens.spacings.add(val)
      return
    }
    if (typeof val === 'string') {
      // "16px 16px" → 拆分为两个值
      for (const part of val.split(/\s+/)) {
        const num = parseFloat(part)
        if (!isNaN(num) && num > 0 && num <= 200) tokens.spacings.add(num)
      }
    }
  }
  for (const key of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft']) {
    addSpacing(layout[key])
  }
  addSpacing(layout.padding)
  addSpacing(layout.margin)
  addSpacing(flex.gap)
  addSpacing(flex.rowGap)
  addSpacing(flex.columnGap)

  // 圆角（支持四角不同值 + 字符串 "24px"，超大值映射为 9999）
  function addRadius(val) {
    const num = typeof val === 'number' ? val : parseFloat(val)
    if (isNaN(num) || num <= 0) return
    tokens.radii.add(num > 1000 ? 9999 : num)
  }
  const radius = node.borderRadius
  if (radius != null) {
    if (typeof radius === 'object' && !Array.isArray(radius)) {
      for (const v of Object.values(radius)) addRadius(v)
    } else {
      addRadius(radius)
    }
  }

  // 阴影（支持字符串引用 + CSS box-shadow 解析）
  let effects = []
  if (typeof node.effect === 'string' && node.effect.startsWith('effect_')) {
    const styles = dsl.styles || {}
    const entry = styles[node.effect]
    const values = entry?.value
    // value 可能是数组（多条 CSS），逐条解析
    const cssStrings = Array.isArray(values) ? values.filter(v => typeof v === 'string') : (typeof values === 'string' ? [values] : [])
    for (const css of cssStrings) {
      if (css.includes('box-shadow')) {
        effects.push(...parseCssBoxShadow(css))
      }
      const blurMatch = css.match(/blur\((\d+)px\)/)
      if (blurMatch) {
        tokens.shadows.add(`blur ${blurMatch[1]}px`)
      }
    }
  } else {
    effects = Array.isArray(node.effect) ? node.effect : (node.effect ? [node.effect] : [])
  }
  for (const eff of effects) {
    if (eff.type === 'shadow' || eff.type === 'dropShadow' || eff.type === 'innerShadow' || eff.x != null) {
      const shadowKey = [
        eff.inset || eff.type === 'innerShadow' ? 'inset' : '',
        `${eff.x ?? 0}px`, `${eff.y ?? 0}px`, `${eff.blur ?? 0}px`, `${eff.spread ?? 0}px`,
        eff.color || ''
      ].filter(Boolean).join(' ')
      tokens.shadows.add(shadowKey)
      if (eff.color) addColor(tokens, eff.color)
    }
  }

  // 尺寸
  if (layout.width != null && layout.width > 0) tokens.sizes.add(Math.round(layout.width))
  if (layout.height != null && layout.height > 0) tokens.sizes.add(Math.round(layout.height))

  // 递归
  for (const child of node.children || []) {
    extractTokens(dsl, child, tokens)
  }
}

function tokensToJson(tokens) {
  return {
    colors: [...tokens.colors].sort(),
    fonts: [...tokens.fonts].sort(),
    spacings: [...tokens.spacings].sort((a, b) => a - b),
    radii: [...tokens.radii].sort((a, b) => a - b),
    shadows: [...tokens.shadows],
    gradients: [...tokens.gradients],
    sizes: [...tokens.sizes].sort((a, b) => a - b),
    summary: {
      colors: tokens.colors.size,
      fonts: tokens.fonts.size,
      spacings: tokens.spacings.size,
      radii: tokens.radii.size,
      shadows: tokens.shadows.size,
      gradients: tokens.gradients.size,
      sizes: tokens.sizes.size,
    }
  }
}

// ─── SVG 组装 ──────────────────────────────────────────────────

function resolveSvgFill(fillInfo) {
  if (!fillInfo) return 'none'
  if (fillInfo.type === 'gradient' || fillInfo.type === 'image') return 'none'
  if (typeof fillInfo === 'string') return fillInfo
  if (fillInfo.value && typeof fillInfo.value === 'string') return fillInfo.value
  if (fillInfo.token) return 'currentColor'
  return 'none'
}

/** 从 SVG path data 中提取所有数值坐标，计算 bounding box */
function pathDataBBox(pathData) {
  if (!pathData) return null
  const nums = []
  // 提取所有数值（含负数和小数）
  const matches = pathData.matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)
  for (const m of matches) nums.push(parseFloat(m[0]))
  if (nums.length < 2) return null
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  // 简易方式：偶数索引为 x，奇数为 y（对 Q/C 曲线控制点也适用）
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i], y = nums[i + 1]
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  if (!isFinite(minX)) return null
  const w = Math.ceil((maxX - minX) * 10) / 10
  const h = Math.ceil((maxY - minY) * 10) / 10
  return { x: Math.floor(minX * 10) / 10, y: Math.floor(minY * 10) / 10, width: w || 1, height: h || 1 }
}

function buildSvgMarkup(resource) {
  if (resource.resource_type !== 'svg') return null
  const bounds = resource.bounds
  const vw = bounds ? Math.round(bounds.width) : 24
  const vh = bounds ? Math.round(bounds.height) : 24
  const parentX = bounds ? bounds.x : 0
  const parentY = bounds ? bounds.y : 0

  // 单个 path — 用 path data 的 bounding box 作为 viewBox
  if (resource.path_data) {
    const fill = resolveSvgFill(resource.fill)
    const strokeAttrs = buildStrokeAttrs(resource.stroke)
    const fillRuleAttr = ` fill-rule="${resource.fillRule || 'evenodd'}"`
    const bbox = pathDataBBox(resource.path_data)
    if (bbox) {
      const pad = 0.5
      const vx = Math.floor((bbox.x - pad) * 10) / 10
      const vy = Math.floor((bbox.y - pad) * 10) / 10
      const bw = Math.ceil((bbox.width + pad * 2) * 10) / 10
      const bh = Math.ceil((bbox.height + pad * 2) * 10) / 10
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${bw} ${bh}" width="${vw}" height="${vh}" fill="none"><path d="${resource.path_data}" fill="${fill}"${fillRuleAttr}${strokeAttrs}/></svg>`
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" fill="none"><path d="${resource.path_data}" fill="${fill}"${fillRuleAttr}${strokeAttrs}/></svg>`
  }

  // 单个 polygon
  if (resource.points) {
    const fill = resolveSvgFill(resource.fill)
    const strokeAttrs = buildStrokeAttrs(resource.stroke)
    // 如果 points 看起来像 SVG path data（以 M 开头），用 <path>
    if (resource.points.trim().startsWith('M') || resource.points.trim().startsWith('m')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" fill="none"><path d="${resource.points}" fill="${fill}"${strokeAttrs}/></svg>`
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" fill="none"><polygon points="${resource.points}" fill="${fill}"${strokeAttrs}/></svg>`
  }

  // SVG_GROUP — 多子形状（带相对位置计算）
  if (resource.children && resource.children.length > 0) {
    const shapes = resource.children.map(child => {
      const fill = resolveSvgFill(child.fill)
      const strokeAttrs = buildStrokeAttrs(child.stroke)
      // 使用 relPos（节点在父容器中的 relativeX/relativeY），而非绝对坐标差
      const relX = child.relPos ? child.relPos.x : (child.bounds ? Math.round((child.bounds.x - parentX) * 10) / 10 : 0)
      const relY = child.relPos ? child.relPos.y : (child.bounds ? Math.round((child.bounds.y - parentY) * 10) / 10 : 0)

      if (child.shape === 'path' && child.path_data) {
        const fillRuleAttr = ` fill-rule="${child.fillRule || 'evenodd'}"`
        // path 坐标是子节点自身的局部坐标系，需要 translate 到父 SVG 中的正确位置
        const needTranslate = relX !== 0 || relY !== 0
        if (needTranslate) {
          return `  <g transform="translate(${relX}, ${relY})"><path d="${child.path_data}" fill="${fill}"${fillRuleAttr}${strokeAttrs}/></g>`
        }
        return `  <path d="${child.path_data}" fill="${fill}"${fillRuleAttr}${strokeAttrs}/>`
      }
      if (child.shape === 'polygon' && child.points) {
        const needTranslate = relX !== 0 || relY !== 0
        const inner = child.points.trim().startsWith('M') || child.points.trim().startsWith('m')
          ? `<path d="${child.points}" fill="${fill}"${strokeAttrs}/>`
          : `<polygon points="${child.points}" fill="${fill}"${strokeAttrs}/>`
        if (needTranslate) {
          return `  <g transform="translate(${relX}, ${relY})">${inner}</g>`
        }
        return `  ${inner}`
      }
      if (child.shape === 'ellipse' && (child.bounds || child.relPos)) {
        const bw = child.bounds ? child.bounds.width : 0
        const bh = child.bounds ? child.bounds.height : 0
        const rx = Math.round(bw / 2)
        const ry = Math.round(bh / 2)
        const cx = Math.round(relX + rx)
        const cy = Math.round(relY + ry)
        return `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${strokeAttrs}/>`
      }
      if (child.shape === 'rect' && (child.bounds || child.relPos)) {
        const w = child.bounds ? Math.round(child.bounds.width) : 0
        const h = child.bounds ? Math.round(child.bounds.height) : 0
        return `  <rect x="${relX}" y="${relY}" width="${w}" height="${h}" fill="${fill}"${strokeAttrs}/>`
      }
      if (child.shape === 'line' && (child.bounds || child.relPos)) {
        const bw = child.bounds ? child.bounds.width : 0
        const bh = child.bounds ? child.bounds.height : 0
        return `  <line x1="${relX}" y1="${relY}" x2="${Math.round(relX + bw)}" y2="${Math.round(relY + bh)}" stroke="${child.stroke?.color || fill}" stroke-width="${child.stroke?.width || 1}"${strokeAttrs}/>`
      }
      return ''
    }).filter(Boolean).join('\n')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" fill="none">\n${shapes}\n</svg>`
  }

  // 单个形状
  if (resource.type === 'SVG_ELLIPSE' && bounds) {
    const fill = resolveSvgFill(resource.fill)
    const strokeAttrs = buildStrokeAttrs(resource.stroke)
    const cx = Math.round(vw / 2), cy = Math.round(vh / 2)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" fill="none"><ellipse cx="${cx}" cy="${cy}" rx="${cx}" ry="${cy}" fill="${fill}"${strokeAttrs}/></svg>`
  }
  if (resource.type === 'SVG_RECT' && bounds) {
    const fill = resolveSvgFill(resource.fill)
    const strokeAttrs = buildStrokeAttrs(resource.stroke)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" fill="none"><rect width="${vw}" height="${vh}" fill="${fill}"${strokeAttrs}/></svg>`
  }

  return null
}

function enrichResourcesWithSvg(resources) {
  return resources.map(r => {
    if (r.resource_type === 'svg') {
      const markup = buildSvgMarkup(r)
      if (markup) return { ...r, svg_markup: markup }
    }
    return r
  })
}

// ─── Tailwind Map 生成 ─────────────────────────────────────────

/** 生成完整 Tailwind v3 默认调色板 */
function generateTailwindDefaultColors() {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
  const palettes = {
    slate:   ['f8fafc','f1f5f9','e2e8f0','cbd5e1','94a3b8','64748b','475569','334155','1e293b','0f172a','020617'],
    gray:    ['f9fafb','f3f4f6','e5e7eb','d1d5db','9ca3af','6b7280','4b5563','374151','1f2937','111827','030712'],
    zinc:    ['fafafa','f4f4f5','e4e4e7','d4d4d8','a1a1aa','71717a','52525b','3f3f46','27272a','18181b','09090b'],
    neutral: ['fafafa','f5f5f5','e5e5e5','d4d4d4','a3a3a3','737373','525252','404040','262626','171717','0a0a0a'],
    stone:   ['fafaf9','f5f5f4','e7e5e4','d6d3d1','a8a29e','78716c','57534e','44403c','292524','1c1917','0c0a09'],
    red:     ['fef2f2','fee2e2','fecaca','fca5a5','f87171','ef4444','dc2626','b91c1c','991b1b','7f1d1d','450a0a'],
    orange:  ['fff7ed','ffedd5','fed7aa','fdba74','fb923c','f97316','ea580c','c2410c','9a3412','7c2d12','431407'],
    amber:   ['fffbeb','fef3c7','fde68a','fcd34d','fbbf24','f59e0b','d97706','b45309','92400e','78350f','451a03'],
    yellow:  ['fefce8','fef9c3','fef08a','fde047','facc15','eab308','ca8a04','a16207','854d0e','713f12','422006'],
    lime:    ['f7fee7','ecfccb','d9f99d','bef264','a3e635','84cc16','65a30d','4d7c0f','3f6212','365314','1a2e05'],
    green:   ['f0fdf4','dcfce7','bbf7d0','86efac','4ade80','22c55e','16a34a','15803d','166534','14532d','052e16'],
    emerald: ['ecfdf5','d1fae5','a7f3d0','6ee7b7','34d399','10b981','059669','047857','065f46','064e3b','022c22'],
    teal:    ['f0fdfa','ccfbf1','99f6e4','5eead4','2dd4bf','14b8a6','0d9488','0f766e','115e59','134e4a','042f2e'],
    cyan:    ['ecfeff','cffafe','a5f3fc','67e8f9','22d3ee','06b6d4','0891b2','0e7490','155e75','164e63','083344'],
    sky:     ['f0f9ff','e0f2fe','bae6fd','7dd3fc','38bdf8','0ea5e9','0284c7','0369a1','075985','0c4a6e','082f49'],
    blue:    ['eff6ff','dbeafe','bfdbfe','93c5fd','60a5fa','3b82f6','2563eb','1d4ed8','1e40af','1e3a8a','172554'],
    indigo:  ['eef2ff','e0e7ff','c7d2fe','a5b4fc','818cf8','6366f1','4f46e5','4338ca','3730a3','312e81','1e1b4b'],
    violet:  ['f5f3ff','ede9fe','ddd6fe','c4b5fd','a78bfa','8b5cf6','7c3aed','6d28d9','5b21b6','4c1d95','2e1065'],
    purple:  ['faf5ff','f3e8ff','e9d5ff','d8b4fe','c084fc','a855f7','9333ea','7e22ce','6b21a8','581c87','3b0764'],
    fuchsia: ['fdf4ff','fae8ff','f5d0fe','f0abfc','e879f9','d946ef','c026d3','a21caf','86198f','701a75','4a044e'],
    pink:    ['fdf2f8','fce7f3','fbcfe8','f9a8d4','f472b6','ec4899','db2777','be185d','9d174d','831843','500724'],
    rose:    ['fff1f2','ffe4e6','fecdd3','fda4af','fb7185','f43f5e','e11d48','be123c','9f1239','881337','4c0519'],
  }
  const colors = { '#000000': 'black', '#ffffff': 'white' }
  for (const [name, hexes] of Object.entries(palettes)) {
    hexes.forEach((hex, i) => {
      colors[`#${hex}`] = `${name}-${shades[i]}`
    })
  }
  return colors
}

const TAILWIND_DEFAULTS = {
  colors: generateTailwindDefaultColors(),
  spacing: {
    0: '0', 1: 'px', 2: '0.5', 4: '1', 6: '1.5', 8: '2', 10: '2.5', 12: '3', 14: '3.5', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10', 44: '11', 48: '12', 56: '14', 64: '16', 80: '20', 96: '24',
  },
  fontSize: {
    12: 'xs', 14: 'sm', 16: 'base', 18: 'lg', 20: 'xl', 24: '2xl', 30: '3xl', 36: '4xl', 48: '5xl', 60: '6xl',
  },
  borderRadius: {
    0: 'none', 2: 'sm', 4: 'DEFAULT', 6: 'md', 8: 'lg', 12: 'xl', 16: '2xl', 9999: 'full',
  },
  lineHeight: {
    0: '0', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10',
    // 相对值: 1/1.25/1.375/1.5/1.625/2 对应 none/tight/snug/normal/relaxed/loose（无法用 px 映射）
  },
  fontWeight: {
    100: 'thin', 200: 'extralight', 300: 'light', 400: 'normal', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black',
  },
}

/** 尝试动态解析 Tailwind 配置文件（支持 JS/MJS/TS） */
function resolveTailwindConfigDynamic(configPath) {
  const absPath = pathResolve(configPath)
  const ext = extname(configPath)

  const strategies = []
  if (ext === '.ts') {
    strategies.push(
      `npx tsx -e "import c from '${absPath}'; process.stdout.write(JSON.stringify(c))"`,
      `npx tsx -e "const c = require('${absPath}'); process.stdout.write(JSON.stringify(c.default || c))"`,
    )
  }
  strategies.push(
    `node -e "import('${pathToFileURL(absPath).href}').then(m => process.stdout.write(JSON.stringify(m.default || m)))"`,
    `node -e "const c = require('${absPath}'); process.stdout.write(JSON.stringify(c.default || c))"`,
  )

  for (const cmd of strategies) {
    try {
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] })
      if (output.trim()) {
        const config = JSON.parse(output.trim())
        if (config && (config.theme || config.content || config.plugins)) {
          return config
        }
      }
    } catch { /* try next */ }
  }
  return null
}

/** 从已解析的配置对象提取 theme 映射 */
function extractThemeFromConfig(config) {
  if (!config?.theme) return null
  const theme = config.theme
  const extend = theme.extend || {}

  const map = { colors: {}, spacing: {}, fontSize: {}, borderRadius: {}, lineHeight: {}, fontWeight: {} }

  // 递归展平颜色对象
  function flattenColors(obj, prefix = '') {
    if (!obj || typeof obj !== 'object') return
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && (value.startsWith('#') || value.startsWith('rgb'))) {
        const name = key === 'DEFAULT' ? prefix : (prefix ? `${prefix}-${key}` : key)
        if (name) {
          const normalized = normalizeColor(value)
          if (normalized) map.colors[normalized] = name
        }
      } else if (typeof value === 'object' && value !== null) {
        flattenColors(value, prefix ? `${prefix}-${key}` : key)
      }
    }
  }

  flattenColors(theme.colors || {})
  flattenColors(extend.colors || {})

  // 通用 px 提取
  function extractPxMap(src, target) {
    if (!src) return
    for (const [key, value] of Object.entries(src)) {
      let raw = Array.isArray(value) ? value[0] : value
      if (typeof raw !== 'string' && typeof raw !== 'number') continue
      let px = parseFloat(raw)
      if (typeof raw === 'string' && raw.includes('rem')) px *= 16
      if (!isNaN(px)) target[Math.round(px)] = key
    }
  }

  extractPxMap({ ...(theme.spacing || {}), ...(extend.spacing || {}) }, map.spacing)
  extractPxMap({ ...(theme.fontSize || {}), ...(extend.fontSize || {}) }, map.fontSize)
  extractPxMap({ ...(theme.borderRadius || {}), ...(extend.borderRadius || {}) }, map.borderRadius)
  extractPxMap({ ...(theme.lineHeight || {}), ...(extend.lineHeight || {}) }, map.lineHeight)

  // fontWeight 是数值映射
  const fontWeight = { ...(theme.fontWeight || {}), ...(extend.fontWeight || {}) }
  for (const [key, value] of Object.entries(fontWeight)) {
    const num = parseInt(value)
    if (!isNaN(num)) map.fontWeight[num] = key
  }

  return map
}

/** 正则回退解析（改进：支持嵌套颜色对象） */
function parseTailwindConfigRegex(configPath) {
  const content = readFileSync(configPath, 'utf-8')
  const map = { colors: {}, spacing: {}, fontSize: {}, borderRadius: {}, lineHeight: {}, fontWeight: {} }

  // 提取颜色 — 支持一层嵌套: primary: { DEFAULT: '#x', light: '#y' } 和简单 primary: '#x'
  const colorBlocks = content.matchAll(/colors\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g)
  for (const match of colorBlocks) {
    const block = match[1]
    // 嵌套对象: blue: { 100: '#dbeafe', 200: '#bfdbfe' }
    const nestedPattern = /['"]?(\w[\w-]*)['"]?\s*:\s*\{([^}]+)\}/g
    for (const [, groupName, innerBlock] of block.matchAll(nestedPattern)) {
      const innerPairs = innerBlock.matchAll(/['"]?(\w[\w-]*)['"]?\s*:\s*['"]([#\w]+)['"]/g)
      for (const [, shade, value] of innerPairs) {
        if (value.startsWith('#')) {
          const name = shade === 'DEFAULT' ? groupName : `${groupName}-${shade}`
          map.colors[value.toLowerCase()] = name
        }
      }
    }
    // 简单键值: primary: '#02B3D6'
    const simpleColors = block.matchAll(/['"]?(\w[\w-]*)['"]?\s*:\s*['"]([#\w]+)['"]/g)
    for (const [, name, value] of simpleColors) {
      if (value.startsWith('#') && !map.colors[value.toLowerCase()]) {
        map.colors[value.toLowerCase()] = name
      }
    }
  }

  // 通用正则提取
  function extractBlockPairs(blockName, target, convertToPx = true) {
    const regex = new RegExp(`${blockName}\\s*:\\s*\\{([^}]*)\\}`, 'g')
    for (const match of content.matchAll(regex)) {
      const pairs = match[1].matchAll(/['"]?(\w[\w.]*)['"]?\s*:\s*(?:['"]([^'"]+)['"]|\[['"]([^'"]+)['"])/g)
      for (const [, name, val1, val2] of pairs) {
        const val = val1 || val2
        if (!val) continue
        let px = parseFloat(val)
        if (convertToPx && val.includes('rem')) px = parseFloat(val) * 16
        if (!isNaN(px)) target[Math.round(px)] = name
      }
    }
  }

  extractBlockPairs('spacing', map.spacing)
  extractBlockPairs('fontSize', map.fontSize)
  extractBlockPairs('borderRadius', map.borderRadius)
  extractBlockPairs('lineHeight', map.lineHeight)

  // fontWeight
  const weightBlocks = content.matchAll(/fontWeight\s*:\s*\{([^}]*)\}/g)
  for (const match of weightBlocks) {
    const pairs = match[1].matchAll(/['"]?(\w[\w-]*)['"]?\s*:\s*['"]?(\d+)['"]?/g)
    for (const [, name, value] of pairs) {
      map.fontWeight[parseInt(value)] = name
    }
  }

  return map
}

function parseTailwindConfig(configPath) {
  if (!existsSync(configPath)) {
    console.error(`Error: 文件不存在: ${configPath}`)
    process.exit(1)
  }

  // 优先尝试动态解析
  let projectMap = null
  const dynamicConfig = resolveTailwindConfigDynamic(configPath)
  if (dynamicConfig) {
    projectMap = extractThemeFromConfig(dynamicConfig)
    if (projectMap) {
      console.error('Tailwind 配置: 动态解析成功')
    }
  }

  // 回退到正则解析
  if (!projectMap) {
    console.error('Tailwind 配置: 使用正则解析（回退模式）')
    projectMap = parseTailwindConfigRegex(configPath)
  }

  // 合并 Tailwind 默认值（项目自定义优先）
  const merged = {
    colors: { ...TAILWIND_DEFAULTS.colors, ...projectMap.colors },
    spacing: { ...TAILWIND_DEFAULTS.spacing, ...projectMap.spacing },
    fontSize: { ...TAILWIND_DEFAULTS.fontSize, ...projectMap.fontSize },
    borderRadius: { ...TAILWIND_DEFAULTS.borderRadius, ...projectMap.borderRadius },
    lineHeight: { ...TAILWIND_DEFAULTS.lineHeight, ...(projectMap.lineHeight || {}) },
    fontWeight: { ...TAILWIND_DEFAULTS.fontWeight, ...(projectMap.fontWeight || {}) },
  }

  return { project: projectMap, merged }
}

// ─── 入口 ─────────────────────────────────────────────────────

function getRoot(dsl) {
  const nodes = dsl.nodes
  if (Array.isArray(nodes) && nodes.length > 0) return nodes[0]
  if (typeof nodes === 'object' && !Array.isArray(nodes)) return nodes
  console.error('Error: 无法获取根节点')
  process.exit(1)
}

function extractResourcesList(dslPath) {
  const dsl = loadDsl(dslPath)
  const root = getRoot(dsl)
  const raw = extractResources(dsl, root)
  const enriched = enrichResourcesWithSvg(raw)
  return deduplicateResources(enriched.map(compactResource))
}

function extractTokensList(dslPath) {
  const dsl = loadDsl(dslPath)
  const root = getRoot(dsl)
  const tokens = { colors: new Set(), fonts: new Set(), spacings: new Set(), radii: new Set(), shadows: new Set(), gradients: new Set(), sizes: new Set() }
  extractTokens(dsl, root, tokens)
  return tokensToJson(tokens)
}

function exportSvgs(resourcesPath, outputDir) {
  if (!existsSync(resourcesPath)) {
    console.error(`Error: 文件不存在: ${resourcesPath}`)
    process.exit(1)
  }
  const resources = JSON.parse(readFileSync(resourcesPath, 'utf-8'))
  mkdirSync(outputDir, { recursive: true })

  let count = 0
  const written = []
  for (const r of resources) {
    if (r.resource_type !== 'svg' || !r.svg_markup) continue
    // 文件名：semantic_name 转 kebab-case
    const name = (r.semantic_name || r.node_id || `svg-${count}`)
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[_\s]+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase()
    const filePath = pathResolve(outputDir, `${name}.svg`)
    writeFileSync(filePath, r.svg_markup, 'utf-8')
    written.push({ name: `${name}.svg`, node_id: r.node_id, size: r.size })
    count++
  }
  console.error(`SVG 文件已导出: ${outputDir}（共 ${count} 个）`)
  return written
}

function writeOutput(result, outputPath, label) {
  const jsonStr = JSON.stringify(result, null, 2)
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, jsonStr, 'utf-8')
    const count = Array.isArray(result) ? result.length : Object.keys(result).length
    console.error(`${label}已写入: ${outputPath}（共 ${count} 项）`)
  } else {
    console.log(jsonStr)
  }
}

// ─── Fetch SVGs via per-node DSL API ──────────────────────────────

async function fetchNodeDsl(baseUrl, fileId, nodeId, pat, noproxy) {
  const url = `${baseUrl}/mcp/dsl?fileId=${encodeURIComponent(fileId)}&layerId=${encodeURIComponent(nodeId)}`
  let cmd = `curl -s --max-time 15 -H "X-MG-UserAccessToken: ${pat}" -H "Content-Type: application/json" -H "Accept: application/json"`
  if (noproxy) cmd += ` --noproxy '*'`
  cmd += ` "${url}"`
  try {
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 20000 })
    return JSON.parse(result)
  } catch {
    return null
  }
}

function buildSvgFromNodeDsl(dsl) {
  if (!dsl || !dsl.nodes || dsl.nodes.length === 0) return null
  let root = dsl.nodes[0]

  // 向下钻取：如果根节点是"大容器包小图标"模式（如 56x56 包含 SVG_ELLIPSE 背景 + 36x36 图标），
  // 则跳过背景层，只取实际图标子节点
  const children = root.children || []
  if (children.length === 2) {
    const [a, b] = children
    const aType = a.type || '', bType = b.type || ''
    const rootW = root.layoutStyle?.width || 0
    // 模式：一个大尺寸 SVG_ELLIPSE/LAYER + 一个小尺寸 FRAME → 取 FRAME 作为根
    if ((aType === 'SVG_ELLIPSE' || aType === 'LAYER') && bType === 'FRAME') {
      const bW = b.layoutStyle?.width || 0
      if (bW > 0 && bW < rootW * 0.8) root = b
    } else if (aType === 'FRAME' && (bType === 'SVG_ELLIPSE' || bType === 'LAYER')) {
      const aW = a.layoutStyle?.width || 0
      if (aW > 0 && aW < rootW * 0.8) root = a
    }
  }

  const w = Math.round(root.layoutStyle?.width || 24)
  const h = Math.round(root.layoutStyle?.height || 24)

  // Collect all SVG shapes from this clean sub-tree
  const shapes = collectSvgChildren(dsl, root)
  if (shapes.length === 0) return null

  const parts = shapes.map(child => {
    const fill = resolveSvgFill(child.fill)
    const strokeAttrs = buildStrokeAttrs(child.stroke)
    const relX = child.relPos ? child.relPos.x : 0
    const relY = child.relPos ? child.relPos.y : 0

    if (child.shape === 'path' && child.path_data) {
      const fillRuleAttr = ` fill-rule="${child.fillRule || 'evenodd'}"`
      const needTranslate = relX !== 0 || relY !== 0
      if (needTranslate) {
        return `  <g transform="translate(${relX}, ${relY})"><path d="${child.path_data}" fill="${fill}"${fillRuleAttr}${strokeAttrs}/></g>`
      }
      return `  <path d="${child.path_data}" fill="${fill}"${fillRuleAttr}${strokeAttrs}/>`
    }
    if (child.shape === 'ellipse') {
      const bw = child.bounds ? child.bounds.width : 0
      const bh = child.bounds ? child.bounds.height : 0
      const rx = Math.round(bw / 2 * 10) / 10
      const ry = Math.round(bh / 2 * 10) / 10
      const cx = Math.round((relX + rx) * 10) / 10
      const cy = Math.round((relY + ry) * 10) / 10
      return `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${strokeAttrs}/>`
    }
    if (child.shape === 'rect') {
      const rw = child.bounds ? Math.round(child.bounds.width) : 0
      const rh = child.bounds ? Math.round(child.bounds.height) : 0
      // Skip near-transparent background rects
      if (fill.includes('0.01') || fill === 'none') return ''
      return `  <rect x="${relX}" y="${relY}" width="${rw}" height="${rh}" fill="${fill}"${strokeAttrs}/>`
    }
    if (child.shape === 'polygon' && child.points) {
      const needTranslate = relX !== 0 || relY !== 0
      const inner = child.points.trim().startsWith('M') || child.points.trim().startsWith('m')
        ? `<path d="${child.points}" fill="${fill}" fill-rule="evenodd"${strokeAttrs}/>`
        : `<polygon points="${child.points}" fill="${fill}"${strokeAttrs}/>`
      if (needTranslate) return `  <g transform="translate(${relX}, ${relY})">${inner}</g>`
      return `  ${inner}`
    }
    return ''
  }).filter(Boolean)

  if (parts.length === 0) return null
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none">\n${parts.join('\n')}\n</svg>`
}

async function fetchSvgs(resourcesPath, outputDir, options) {
  const { pat, baseUrl, fileId, noproxy } = options
  if (!pat || !baseUrl || !fileId) {
    console.error('Error: --pat, --base-url, --file-id 参数必填')
    process.exit(1)
  }
  if (!existsSync(resourcesPath)) {
    console.error(`Error: 文件不存在: ${resourcesPath}`)
    process.exit(1)
  }

  const resources = JSON.parse(readFileSync(resourcesPath, 'utf-8'))
  mkdirSync(outputDir, { recursive: true })

  const svgResources = resources.filter(r => r.resource_type === 'svg')
  console.error(`发现 ${svgResources.length} 个 SVG 资源，开始逐节点获取 DSL...`)

  const written = []
  let fetchOk = 0, fetchFail = 0, fallbackCount = 0

  for (const r of svgResources) {
    const nodeId = r.node_id
    const name = (r.semantic_name || r.node_id || `svg-${written.length}`)
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[_\s]+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase()

    // Step 1: Try fetching individual node DSL
    let svg = null
    const nodeDsl = await fetchNodeDsl(baseUrl, fileId, nodeId, pat, noproxy)
    if (nodeDsl && nodeDsl.nodes && nodeDsl.nodes.length > 0) {
      svg = buildSvgFromNodeDsl(nodeDsl)
      if (svg) fetchOk++
    }

    // Step 2: Fallback to pre-built svg_markup from resources.json
    if (!svg && r.svg_markup) {
      svg = r.svg_markup
      fallbackCount++
    }

    if (!svg) {
      fetchFail++
      console.error(`  ✗ ${name} (${r.size}) — 获取失败，跳过`)
      continue
    }

    const filePath = pathResolve(outputDir, `${name}.svg`)
    writeFileSync(filePath, svg, 'utf-8')
    written.push({ name: `${name}.svg`, node_id: nodeId, size: r.size, source: nodeDsl ? 'api' : 'fallback' })
    const source = svg !== r.svg_markup ? 'API' : 'fallback'
    console.error(`  ✓ ${name}.svg (${r.size}) [${source}]`)
  }

  console.error(`\n完成: ${fetchOk} 个 API 获取, ${fallbackCount} 个 fallback, ${fetchFail} 个失败`)
  return written
}

function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error(`MasterGo DSL Parser v${VERSION}`)
    console.error('用法:')
    console.error('  node dsl-parser.mjs resources <dsl_raw.json> [output.json]   — 提取资源清单（含 SVG markup + stroke）')
    console.error('  node dsl-parser.mjs tokens <dsl_raw.json> [output.json]      — 提取 design tokens（含 rgba/渐变/textSegments）')
    console.error('  node dsl-parser.mjs tailwind-map <tailwind.config.*> [output.json] — 生成 Tailwind 值→class 映射表（含 lineHeight/fontWeight）')
    console.error('  node dsl-parser.mjs export-svgs <resources.json> <output-dir>     — 批量导出 SVG 文件到目录')
    console.error('  node dsl-parser.mjs fetch-svgs <resources.json> <output-dir> --pat <pat> --base-url <url> --file-id <id> [--noproxy]')
    console.error('                                                                     — 逐节点请求 DSL 后精确重建 SVG（推荐）')
    process.exit(1)
  }

  const [command, inputPath, outputPath] = args

  switch (command) {
    case 'resources': {
      const result = extractResourcesList(inputPath)
      writeOutput(result, outputPath, '资源清单')
      break
    }
    case 'tokens': {
      const result = extractTokensList(inputPath)
      writeOutput(result, outputPath, 'Design tokens')
      break
    }
    case 'tailwind-map': {
      const result = parseTailwindConfig(inputPath)
      writeOutput(result, outputPath, 'Tailwind 映射表')
      break
    }
    case 'export-svgs': {
      const result = exportSvgs(inputPath, outputPath || './svgs')
      for (const f of result) {
        console.error(`  ${f.name} (${f.size}) [${f.node_id}]`)
      }
      break
    }
    case 'fetch-svgs': {
      // Parse named args: --pat xxx --base-url xxx --file-id xxx [--noproxy]
      const namedArgs = {}
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--pat' && args[i + 1]) { namedArgs.pat = args[++i]; continue }
        if (args[i] === '--base-url' && args[i + 1]) { namedArgs.baseUrl = args[++i]; continue }
        if (args[i] === '--file-id' && args[i + 1]) { namedArgs.fileId = args[++i]; continue }
        if (args[i] === '--noproxy') { namedArgs.noproxy = true; continue }
      }
      fetchSvgs(inputPath, outputPath || './svgs', namedArgs).then(result => {
        for (const f of result) {
          // output to stdout for script consumption
        }
      }).catch(err => {
        console.error('fetch-svgs 执行失败:', err.message)
        process.exit(1)
      })
      break
    }
    default:
      console.error(`未知命令: ${command}（支持: resources, tokens, tailwind-map, export-svgs, fetch-svgs）`)
      process.exit(1)
  }
}

main()

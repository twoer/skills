#!/usr/bin/env python3
"""
MasterGo DSL Parser — 从 dsl_raw.json 提取结构化数据。

用法:
  python3 dsl-parser.py resources <dsl_raw.json>  # 仅资源清单
  python3 dsl-parser.py tokens <dsl_raw.json>     # 仅 Design Tokens

输出: JSON 到 stdout，供 LLM 参考。
"""

import json
import re
import sys
from pathlib import Path

VERSION = "2.0.0"

# ─── 工具函数 ──────────────────────────────────────────────────


def load_dsl(path: str) -> dict:
    """加载并验证 DSL JSON 文件。"""
    p = Path(path)
    if not p.exists():
        print(f"Error: 文件不存在: {path}", file=sys.stderr)
        sys.exit(1)
    with open(p, "r", encoding="utf-8") as f:
        dsl = json.load(f)
    if "nodes" not in dsl:
        print("Error: DSL 缺少 'nodes' 字段", file=sys.stderr)
        sys.exit(1)
    return dsl


def resolve_style_value(dsl: dict, ref_key: str) -> str | None:
    """解析样式引用，返回实际值。支持 paint_* → 颜色, effect_* → box-shadow"""
    styles = dsl.get("styles", {})
    entry = styles.get(ref_key)
    if not entry:
        return None
    value = entry.get("value", [])
    if isinstance(value, list):
        for v in value:
            if v and isinstance(v, str) and v.strip():
                return v.strip()
    elif isinstance(value, str) and value.strip():
        return value.strip()
    return None


def resolve_fill_color(dsl: dict, node: dict) -> str | None:
    """解析节点的 fill 字段为实际颜色值。"""
    fill = node.get("fill")
    if not fill:
        return None
    if isinstance(fill, str) and fill.startswith("#"):
        return fill
    if isinstance(fill, str) and (fill.startswith("paint_") or fill.startswith("effect_")):
        return resolve_style_value(dsl, fill)
    if isinstance(fill, list) and fill:
        first = fill[0]
        if isinstance(first, str) and first.startswith("#"):
            return first
        if isinstance(first, str):
            return resolve_style_value(dsl, first)
    return None


def resolve_effect_shadow(dsl: dict, node: dict) -> str | None:
    """解析节点的 effect 引用为实际 box-shadow 值。"""
    effect = node.get("effect")
    if not effect:
        return None
    if isinstance(effect, list) and not effect:
        return None
    if isinstance(effect, str):
        return resolve_style_value(dsl, effect)
    return None


def get_node_bounds(node: dict) -> dict | None:
    """获取节点的边界信息。"""
    layout = node.get("layoutStyle", {})
    x = layout.get("x") or layout.get("left")
    y = layout.get("y") or layout.get("top")
    w = layout.get("width")
    h = layout.get("height")
    if w is not None and h is not None:
        return {
            "x": round(x, 1) if x is not None else 0,
            "y": round(y, 1) if y is not None else 0,
            "width": round(w, 1),
            "height": round(h, 1),
        }
    return None


def to_pascal_case(name: str) -> str:
    """转换为 PascalCase。"""
    if not name:
        return "Unnamed"
    name = re.sub(r"^[^\w]+", "", name)
    name = re.sub(r"^_", "", name)
    if not name:
        return "Unnamed"
    words = re.sub(r"[_\-\s]+", " ", name).split()
    return "".join(w.capitalize() for w in words)


def parse_px(value) -> float | None:
    """解析 CSS 像素值（支持 '320px'、'320'、320 等格式）。"""
    if value is None:
        return None
    s = str(value).strip().rstrip("px").strip()
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


# ─── 资源提取 ──────────────────────────────────────────────────


def extract_resources(dsl: dict, node: dict, parent_id: str = "") -> list:
    """递归提取图片和 SVG 资源。"""
    resources = []
    node_id = node.get("id", "")
    node_type = node.get("type", "")
    name = node.get("name", "")
    semantic_name = to_pascal_case(name)

    # LAYER + 图片 fill
    if node_type == "LAYER":
        fill = node.get("fill")
        if isinstance(fill, list):
            for f in fill:
                if isinstance(f, dict) and "url" in str(f):
                    url = f.get("url", "")
                    if url:
                        resources.append({
                            "node_id": node_id,
                            "semantic_name": semantic_name,
                            "type": node_type,
                            "resource_type": "image",
                            "url": url,
                            "bounds": get_node_bounds(node),
                            "parent_id": parent_id,
                        })
                        break
                elif isinstance(f, str) and "url" in f:
                    resources.append({
                        "node_id": node_id,
                        "semantic_name": semantic_name,
                        "type": node_type,
                        "resource_type": "image",
                        "url": f,
                        "bounds": get_node_bounds(node),
                        "parent_id": parent_id,
                    })
                    break

    # PATH → SVG
    if node_type == "PATH":
        path_field = node.get("path", {})
        if isinstance(path_field, list) and path_field:
            path_data = path_field[0].get("data", "")
        elif isinstance(path_field, dict):
            path_data = path_field.get("data", "")
        else:
            path_data = ""
        fill_color = resolve_fill_color(dsl, node)
        bounds = get_node_bounds(node)
        if path_data or fill_color:
            entry = {
                "node_id": node_id,
                "semantic_name": semantic_name,
                "type": node_type,
                "resource_type": "svg",
                "path_data": path_data[:200] if path_data else None,
                "fill": fill_color,
                "bounds": bounds,
                "parent_id": parent_id,
            }
            resources.append(entry)

    # SVG_ELLIPSE → SVG
    if node_type == "SVG_ELLIPSE":
        fill_color = resolve_fill_color(dsl, node)
        bounds = get_node_bounds(node)
        resources.append({
            "node_id": node_id,
            "semantic_name": semantic_name,
            "type": node_type,
            "resource_type": "svg",
            "fill": fill_color,
            "bounds": bounds,
            "parent_id": parent_id,
        })

    # 递归子节点
    for child in node.get("children", []):
        resources.extend(extract_resources(dsl, child, node_id))

    return resources


# ─── Token 提取 ────────────────────────────────────────────────


def extract_tokens(dsl: dict, node: dict, depth: int = 0) -> dict:
    """从 DSL 节点树中递归提取 Design Tokens。"""
    colors = []
    border_radii = []
    shadows = []
    font_sizes = set()
    font_weights = set()
    gaps = set()
    paddings = set()

    layout = node.get("layoutStyle", {})

    # 背景色
    bg = resolve_fill_color(dsl, node)
    if bg and bg.startswith("#"):
        colors.append({"value": bg, "usage": node.get("name", "")})

    # 文本色
    text_color = layout.get("color")
    if text_color and text_color.startswith("#"):
        colors.append({"value": text_color, "usage": node.get("name", "")})

    # 圆角
    br = layout.get("borderRadius")
    if br is not None:
        try:
            border_radii.append({"value": float(br), "node_id": node.get("id", ""), "usage": node.get("name", "")})
        except (ValueError, TypeError):
            pass

    # 阴影
    shadow = resolve_effect_shadow(dsl, node)
    if shadow:
        shadows.append({"value": shadow, "node_id": node.get("id", ""), "usage": node.get("name", "")})

    # 字体
    font_size = parse_px(layout.get("fontSize"))
    if font_size is not None:
        font_sizes.add(int(font_size))
    font_weight = layout.get("fontWeight")
    if font_weight is not None:
        try:
            font_weights.add(int(float(font_weight)))
        except (ValueError, TypeError):
            pass

    # 间距
    gap = parse_px(layout.get("gap"))
    if gap is not None:
        gaps.add(int(gap))
    padding = parse_px(layout.get("padding"))
    if padding is not None:
        paddings.add(int(padding))

    # 递归子节点
    for child in node.get("children", []):
        child_tokens = extract_tokens(dsl, child, depth + 1)
        colors.extend(child_tokens["colors"])
        border_radii.extend(child_tokens["border_radius"])
        shadows.extend(child_tokens["shadows"])
        font_sizes.update(child_tokens["fonts"]["sizes"])
        font_weights.update(child_tokens["fonts"]["weights"])
        gaps.update(child_tokens["spacing"]["gaps"])
        paddings.update(child_tokens["spacing"]["paddings"])

    # 颜色去重
    seen = set()
    unique_colors = []
    for c in colors:
        if c["value"] not in seen:
            seen.add(c["value"])
            unique_colors.append(c)
    unique_colors.sort(key=lambda x: x["value"])
    border_radii.sort(key=lambda x: x["value"])

    return {
        "colors": unique_colors,
        "border_radius": border_radii,
        "shadows": shadows,
        "fonts": {"sizes": sorted(font_sizes), "weights": sorted(font_weights)},
        "spacing": {"gaps": sorted(gaps), "paddings": sorted(paddings)},
    }


# ─── 入口 ─────────────────────────────────────────────────────


def get_root(dsl: dict) -> dict:
    """获取 DSL 根节点。"""
    nodes = dsl.get("nodes", [])
    if isinstance(nodes, list) and nodes:
        return nodes[0]
    if isinstance(nodes, dict):
        return nodes
    print("Error: 无法获取根节点", file=sys.stderr)
    sys.exit(1)


def resources_only(dsl_path: str) -> list:
    """仅提取资源列表。"""
    dsl = load_dsl(dsl_path)
    root = get_root(dsl)
    all_resources = extract_resources(dsl, root)
    # 精简输出
    result = []
    for r in all_resources:
        compact = {
            "node_id": r["node_id"],
            "semantic_name": r["semantic_name"],
            "resource_type": r["resource_type"],
        }
        if r.get("url"):
            compact["url"] = r["url"]
        if r.get("fill"):
            compact["fill"] = r["fill"]
        bounds = r.get("bounds")
        if bounds:
            compact["size"] = f"{int(bounds['width'])}x{int(bounds['height'])}"
        result.append(compact)
    return result


def tokens_only(dsl_path: str) -> dict:
    """仅提取 Design Tokens。"""
    dsl = load_dsl(dsl_path)
    root = get_root(dsl)
    return extract_tokens(dsl, root)


def main():
    if len(sys.argv) < 3:
        print("用法: python3 dsl-parser.py [resources|tokens] <dsl_raw.json>", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]
    dsl_path = sys.argv[2]

    if command == "resources":
        result = resources_only(dsl_path)
    elif command == "tokens":
        result = tokens_only(dsl_path)
    else:
        print(f"未知命令: {command}（支持: resources, tokens）", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

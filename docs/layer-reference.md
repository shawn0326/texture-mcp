# Layer Reference

This document is a stable reference for the current recipe DSL layer types.
Use it together with the MCP tools:

1. `list_layer_types` to discover names.
2. `get_layer_schema` to fetch structured semantics for one type.
3. `validate_recipe` before `generate_texture` in `recipe` mode.

## Shared Rules

- Recipes are flat ordered layer lists. Order matters.
- Draw layers add new pixels to the current canvas.
- Effect layers transform the current whole canvas result.
- Most coordinates are normalized to the canvas range `[0, 1]`.
- Circle and ring radii are normalized to the shorter canvas side.
- Color fields use a validated deterministic subset: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(r, g, b)`, `rgba(r, g, b, a)`, or `transparent`.
- `noise` and `blur` are fullscreen passes, not local modifiers.

## Summary

| Type | Category | Required fields | Typical use |
| --- | --- | --- | --- |
| `gradientCircle` | `draw` | `center`, `radius`, `colors` | glow cores, orbs, radial blooms |
| `circle` | `draw` | `center`, `radius`, `color` | solid cores, discs, masks |
| `ring` | `draw` | `center`, `innerRadius`, `outerRadius`, `color` | shields, portals, scan rings |
| `rect` | `draw` | `origin`, `size`, `color` | bars, panels, masks |
| `gradientRect` | `draw` | `origin`, `size`, `direction`, `colors` | beams, UI bars, ramps |
| `text` | `draw` | `text`, `origin`, `size`, `color` | labels, HUD text, titles |
| `noise` | `effect` | `amount` | grain, breakup, smoke variation |
| `blur` | `effect` | `radius` | bloom, soft falloff, smoothing |

## Draw Layers

### `gradientCircle`

Radial gradient clipped to a circle.

- Required: `center`, `radius`, `colors`
- Constraints: `colors` must contain at least two colors
- Notes:
  - Good first layer for glows and explosions
  - Add `noise` after it to reduce overly clean ramps
  - Add `blur` after it to soften the whole result further

```json
{
  "type": "gradientCircle",
  "center": { "x": 0.5, "y": 0.5 },
  "radius": 0.28,
  "colors": ["rgba(255,255,255,1)", "rgba(255,180,80,0)"]
}
```

### `circle`

Solid filled circle.

- Required: `center`, `radius`, `color`
- Notes:
  - Useful for crisp cores after a blurred background pass
  - Often combined with `gradientCircle` for a bright center plus soft edge

```json
{
  "type": "circle",
  "center": { "x": 0.5, "y": 0.5 },
  "radius": 0.2,
  "color": "rgba(255,255,255,1)"
}
```

### `ring`

Hollow ring defined by inner and outer radii.

- Required: `center`, `innerRadius`, `outerRadius`, `color`
- Constraints: `outerRadius` must be greater than `innerRadius`
- Notes:
  - Best for energy rings and impact outlines
  - Commonly followed by `blur` for a softer shield look

```json
{
  "type": "ring",
  "center": { "x": 0.5, "y": 0.5 },
  "innerRadius": 0.18,
  "outerRadius": 0.25,
  "color": "rgba(160,220,255,0.85)"
}
```

### `rect`

Solid rectangle with optional rounded corners.

- Required: `origin`, `size`, `color`
- Optional: `cornerRadius`, `rotation`
- Notes:
  - `origin` is the normalized top-left corner
  - Rounded corners are built into this layer type
  - `rotation` rotates the rectangle around its own box center in degrees
  - Good for panel bodies, bars, frames, and mask-like blocks

```json
{
  "type": "rect",
  "origin": { "x": 0.18, "y": 0.32 },
  "size": { "width": 0.64, "height": 0.24 },
  "cornerRadius": 0.04,
  "rotation": -12,
  "color": "rgba(24,64,120,0.9)"
}
```

### `gradientRect`

Rectangle filled with a horizontal or vertical gradient.

- Required: `origin`, `size`, `direction`, `colors`
- Optional: `cornerRadius`, `rotation`
- Constraints:
  - `direction` must be `horizontal` or `vertical`
  - `colors` must contain at least two colors
- Notes:
  - Use `horizontal` for left-to-right ramps
  - Use `vertical` for top-to-bottom ramps
  - `rotation` rotates both the box and its gradient around the box center
  - Strong default choice for beams and color ramps

```json
{
  "type": "gradientRect",
  "origin": { "x": 0.1, "y": 0.42 },
  "size": { "width": 0.8, "height": 0.16 },
  "cornerRadius": 0.03,
  "rotation": -18,
  "direction": "horizontal",
  "colors": ["#0018ff", "#00e4ff", "#fff200", "#ff3a00"]
}
```

### `text`

Single-line text drawn inside a normalized layout box.

- Required: `text`, `origin`, `size`, `color`
- Optional:
  - `fontFamily`
  - `fontSize`
  - `fontWeight`
  - `fontStyle`
  - `align`
  - `verticalAlign`
  - `clip`
  - `rotation`
- Constraints: `text` must be non-empty and at most 256 characters
- Notes:
  - Rendering may vary by host because font availability is host-dependent
  - Use multiple `text` layers with offsets for simple shadow or outline tricks
  - `rotation` rotates the whole layout box around its center in degrees
  - Put `blur` after text only if you want the whole text result softened

```json
{
  "type": "text",
  "text": "ALERT",
  "origin": { "x": 0.16, "y": 0.32 },
  "size": { "width": 0.68, "height": 0.2 },
  "rotation": -10,
  "color": "rgba(255,255,255,1)",
  "fontFamily": "sans-serif",
  "fontWeight": "bold",
  "align": "center",
  "verticalAlign": "middle",
  "clip": true
}
```

## Effect Layers

### `noise`

Fullscreen noise pass over the current canvas result.

- Required: `amount`
- Notes:
  - This affects everything already drawn
  - Usually applied before `blur` when building smoke or dirty glow textures
  - Best used in moderate amounts so it adds breakup without destroying the shape

```json
{
  "type": "noise",
  "amount": 0.18
}
```

### `blur`

Fullscreen blur pass over the current canvas result.

- Required: `radius`
- Notes:
  - This affects everything already drawn
  - Place it after the layers you want blurred
  - Commonly used after `ring`, `gradientCircle`, or `noise`

```json
{
  "type": "blur",
  "radius": 0.06
}
```

## Recommended Authoring Flow

1. Start from `list_layer_types`.
2. Inspect one type with `get_layer_schema`.
3. Assemble a small recipe with 1 to 4 layers.
4. Run `validate_recipe`.
5. Render with `generate_texture`.
6. Save the current result with `export_texture`.

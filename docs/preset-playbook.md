# Preset Playbook

This document helps choose and tune the built-in presets.
Presets are the fastest path from semantic intent to a valid recipe.

Use the MCP tools in this order:

1. `list_presets`
2. `get_preset_schema`
3. `generate_texture` with `mode: "preset"`
4. `export_texture`

If you need exact layer-by-layer control, switch to `recipe` mode instead.

## Preset Summary

| Preset | Best for | Main knobs | Compiles to |
| --- | --- | --- | --- |
| `glow` | soft energy cores, small light sprites | `intensity`, `falloff` | `gradientCircle` + `noise` |
| `ring` | shields, portals, impact circles | `thickness`, `softness` | `ring` + `blur` |
| `smoke` | diffuse fog or cloudy texture | `density`, `turbulence` | `noise` + `blur` + `circle` |
| `panel` | sci-fi UI blocks and cards | `width`, `height`, `cornerRadius`, `glow` | `rect` + `blur` + `gradientRect` |
| `beam` | laser slashes, energy strips | `orientation`, `length`, `thickness`, `intensity` | `gradientRect` + `blur` + `rect` |
| `colorRamp` | heatmaps, lookup ramps, palette bands | `palette`, `orientation`, `thickness`, `padding`, `cornerRadius` | `gradientRect` |

## When To Use Presets

- Use presets when you want stable output quickly.
- Use presets when an AI caller should only adjust a few high-level parameters.
- Use recipes when you need precise geometry, exact ordering, or custom combinations.

## Presets

### `glow`

Soft center glow with a little grain.

- Defaults:

```json
{
  "intensity": 0.8,
  "falloff": 0.5
}
```

- Tuning notes:
  - Raise `intensity` to brighten the core and also increase the noise pass slightly
  - Raise `falloff` to enlarge the glow radius
  - Good first choice for magic sparks, pickups, and lens-like light sprites

### `ring`

Circular ring with optional softness.

- Defaults:

```json
{
  "thickness": 0.2,
  "softness": 0.1
}
```

- Tuning notes:
  - Raise `thickness` to widen the visible ring body
  - Raise `softness` to increase blur and produce a more diffuse shield edge
  - Good fit for portals, target markers, shield hits, and scan circles

### `smoke`

Diffuse smoky texture with blur and noise.

- Defaults:

```json
{
  "density": 0.6,
  "turbulence": 0.4
}
```

- Tuning notes:
  - Raise `density` for heavier grain and a larger soft body
  - Raise `turbulence` for a stronger blur pass
  - Use square textures when you want a centered puff

### `panel`

Soft sci-fi panel block with a crisp gradient body and glow.

- Defaults:

```json
{
  "width": 0.72,
  "height": 0.32,
  "cornerRadius": 0.05,
  "glow": 0.35
}
```

- Tuning notes:
  - `width` and `height` control the main body size
  - `cornerRadius` shapes both the body and the glow shell
  - `glow` expands the outer soft block and slightly brightens the panel face
  - Works well as the base for a follow-up `text` recipe

### `beam`

Directional energy beam with a bright core and soft falloff.

- Defaults:

```json
{
  "orientation": "horizontal",
  "length": 0.85,
  "thickness": 0.14,
  "intensity": 0.85
}
```

- Tuning notes:
  - `orientation` picks a horizontal or vertical layout
  - `length` controls how much of the canvas the beam spans
  - `thickness` changes both the soft body and the crisp core thickness
  - `intensity` brightens the center and increases blur slightly

### `colorRamp`

Gradient color band for heatmaps, shader ramps, and palette mapping.

- Defaults:

```json
{
  "palette": "heat",
  "orientation": "horizontal",
  "thickness": 0.14,
  "padding": 0.08,
  "cornerRadius": 0.03
}
```

- Tuning notes:
  - `palette` currently supports `heat`, `fire`, `cool`, and `grayscale`
  - `orientation` switches between horizontal and vertical ramps
  - `padding` controls the empty border around the ramp
  - `cornerRadius` rounds the band ends when the ramp is narrow enough

## Recommended Preset Workflow For AI Callers

1. Call `list_presets` and pick the closest semantic match.
2. Call `get_preset_schema` and start from `defaultParams`.
3. Override only the minimum parameters needed.
4. Render with `generate_texture`.
5. Export if the result is acceptable.
6. Fall back to `recipe` mode only when the preset shape is not expressive enough.

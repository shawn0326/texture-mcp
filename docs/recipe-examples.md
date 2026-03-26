# Recipe Examples

This document collects small stable examples for AI callers and human users.
The examples are intentionally compact and designed to be copied into MCP tool calls.

## Conventions

- Use `preset` mode for fast semantic generation.
- Use `recipe` mode for exact layer ordering and geometry.
- Run `validate_recipe` before `generate_texture` when authoring custom recipes.
- Omit `seed` only when you are happy with the fixed default seed.

## Example 1: Fast Glow Preset

```json
{
  "tool": "generate_texture",
  "arguments": {
    "mode": "preset",
    "preset": "glow",
    "params": {
      "intensity": 0.9,
      "falloff": 0.65
    },
    "width": 256,
    "height": 256,
    "seed": 7
  }
}
```

Use this when you need a soft light sprite or pickup effect with minimal setup.

## Example 2: Ring Shield Preset

```json
{
  "tool": "generate_texture",
  "arguments": {
    "mode": "preset",
    "preset": "ring",
    "params": {
      "thickness": 0.32,
      "softness": 0.28
    },
    "width": 512,
    "height": 512,
    "seed": 12
  }
}
```

Use this for shield hits, portal outlines, or target markers.

## Example 3: Beam Recipe

Validate first:

```json
{
  "tool": "validate_recipe",
  "arguments": {
    "recipe": {
      "version": 1,
      "layers": [
        {
          "type": "gradientRect",
          "origin": { "x": 0.08, "y": 0.43 },
          "size": { "width": 0.84, "height": 0.14 },
          "direction": "horizontal",
          "colors": [
            "rgba(0, 220, 255, 0)",
            "rgba(120, 235, 255, 0.65)",
            "rgba(255, 255, 255, 1)",
            "rgba(120, 235, 255, 0.65)",
            "rgba(0, 220, 255, 0)"
          ]
        },
        {
          "type": "blur",
          "radius": 0.04
        },
        {
          "type": "rect",
          "origin": { "x": 0.08, "y": 0.485 },
          "size": { "width": 0.84, "height": 0.03 },
          "color": "rgba(255, 252, 245, 0.9)"
        }
      ]
    }
  }
}
```

Then render:

```json
{
  "tool": "generate_texture",
  "arguments": {
    "mode": "recipe",
    "recipe": {
      "version": 1,
      "layers": [
        {
          "type": "gradientRect",
          "origin": { "x": 0.08, "y": 0.43 },
          "size": { "width": 0.84, "height": 0.14 },
          "direction": "horizontal",
          "colors": [
            "rgba(0, 220, 255, 0)",
            "rgba(120, 235, 255, 0.65)",
            "rgba(255, 255, 255, 1)",
            "rgba(120, 235, 255, 0.65)",
            "rgba(0, 220, 255, 0)"
          ]
        },
        {
          "type": "blur",
          "radius": 0.04
        },
        {
          "type": "rect",
          "origin": { "x": 0.08, "y": 0.485 },
          "size": { "width": 0.84, "height": 0.03 },
          "color": "rgba(255, 252, 245, 0.9)"
        }
      ]
    },
    "width": 512,
    "height": 128,
    "seed": 5
  }
}
```

Use this when you need a bright beam with a blurred body and a crisp core.

## Example 4: Labeled Panel Recipe

```json
{
  "tool": "generate_texture",
  "arguments": {
    "mode": "recipe",
    "recipe": {
      "version": 1,
      "layers": [
        {
          "type": "rect",
          "origin": { "x": 0.14, "y": 0.28 },
          "size": { "width": 0.72, "height": 0.26 },
          "cornerRadius": 0.04,
          "rotation": -6,
          "color": "rgba(60, 180, 255, 0.18)"
        },
        {
          "type": "blur",
          "radius": 0.03
        },
        {
          "type": "gradientRect",
          "origin": { "x": 0.16, "y": 0.3 },
          "size": { "width": 0.68, "height": 0.22 },
          "cornerRadius": 0.03,
          "rotation": -6,
          "direction": "vertical",
          "colors": [
            "rgba(200, 240, 255, 0.28)",
            "rgba(42, 88, 148, 0.75)",
            "rgba(14, 22, 40, 0.95)"
          ]
        },
        {
          "type": "text",
          "text": "ALERT",
          "origin": { "x": 0.2, "y": 0.35 },
          "size": { "width": 0.6, "height": 0.1 },
          "rotation": -6,
          "color": "rgba(255,255,255,1)",
          "fontFamily": "sans-serif",
          "fontWeight": "bold",
          "align": "center",
          "verticalAlign": "middle",
          "clip": true
        }
      ]
    },
    "width": 512,
    "height": 256,
    "seed": 21
  }
}
```

Use this as a minimal UI card example that mixes draw layers and text.

## Example 5: Export The Current Result

```json
{
  "tool": "export_texture",
  "arguments": {
    "outputPath": "test-output/examples/beam-01.png",
    "format": "png",
    "saveMeta": true
  }
}
```

Notes:

- `outputPath` must be relative.
- The resolved target must stay inside `workspaceRoot`.
- `export_texture` only works after a successful `generate_texture` call in the same MCP session.

## Example 6: Color Ramp Preset

```json
{
  "tool": "generate_texture",
  "arguments": {
    "mode": "preset",
    "preset": "colorRamp",
    "params": {
      "palette": "cool",
      "orientation": "vertical",
      "thickness": 0.22,
      "padding": 0.06,
      "cornerRadius": 0.04
    },
    "width": 128,
    "height": 512,
    "seed": 3
  }
}
```

Use this for palette strips, shader lookup previews, or debug ramps.

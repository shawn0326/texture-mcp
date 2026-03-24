# texture-mcp

A procedural 2D VFX texture generator exposed via MCP, using presets and recipes to produce controllable and reproducible visual assets for AI workflows.

## What It Provides

- Built-in semantic presets that compile into deterministic recipes.
- A small flat recipe DSL for controllable 2D texture composition.
- MCP tools for discovery, validation, generation, and export.
- Reproducible output with an explicit or fixed default `seed`.

## Current Scope

Current built-in presets:

- `glow`
- `ring`
- `smoke`
- `panel`
- `beam`
- `colorRamp`

Current recipe layer types:

- `gradientCircle`
- `circle`
- `ring`
- `rect`
- `gradientRect`
- `text`
- `noise`
- `blur`

Current MCP tools:

- `list_presets`
- `get_preset_schema`
- `list_layer_types`
- `get_layer_schema`
- `validate_recipe`
- `generate_texture`
- `export_texture`

Notes:

- The recipe DSL is intentionally small and flat.
- `noise` and `blur` are full-canvas effect layers, not local shape modifiers.
- `text` uses canvas font-family strings, so rendering may vary slightly across hosts depending on available fonts.
- `export_texture` only writes to relative paths inside `workspaceRoot`.

## Development

```bash
npm install
npm run build
```

Run the compiled MCP entry:

```bash
npm start
```

Run the current smoke test:

```bash
npm test
```

## Use As MCP

This package is currently configured as a CLI-style MCP tool through the `texture-mcp` command.

For local development, build first and then register the compiled entry:

```bash
codex mcp add texture -- node /path/to/dist/mcp/index.js
```

After publishing to npm, it can also be used through the package command:

```bash
codex mcp add texture -- npx -y texture-mcp
```

## Recommended Workflow

For AI callers, the recommended sequence is:

1. `list_presets` or `list_layer_types`
2. `get_preset_schema` or `get_layer_schema`
3. `validate_recipe`
4. `generate_texture`
5. `export_texture`

Use presets when you want a fast semantic starting point.
Use recipe mode when you need precise control over layer composition.

## Structured Output Highlights

The tools return stable `structuredContent` intended for MCP callers.

- `list_presets` returns `count` and `presets`.
- `get_preset_schema` returns full preset schema metadata plus summary fields such as `mode`, `paramCount`, `paramNames`, `requiredParamNames`, and `defaultParamNames`.
- `list_layer_types` returns `count` and `layers`.
- `get_layer_schema` returns full layer semantics plus summary fields such as `mode`, `parameterNames`, `requiredParameterNames`, `constraintFields`, and `exampleCount`.
- `validate_recipe` returns `valid`, `errorCount`, `readyForGeneration`, `errors`, and when valid also `normalizedRecipe` and `stats`.
- `generate_texture` returns `mode`, `width`, `height`, `preset`, `seed`, `usedDefaultSeed`, `recipeLayerCount`, and `currentResultAvailable`.
- `export_texture` returns `savedPath`, `metaPath`, `width`, `height`, `format`, `sourceMode`, `preset`, `seed`, and `metaSaved`.

## Example: Discover A Preset

List available presets:

```json
{
  "tool": "list_presets",
  "arguments": {}
}
```

Inspect one preset:

```json
{
  "tool": "get_preset_schema",
  "arguments": {
    "preset": "beam"
  }
}
```

`get_preset_schema` also returns summary fields that are easier to consume than raw JSON Schema:

- `mode`
- `paramCount`
- `paramNames`
- `requiredParamNames`
- `defaultParamNames`
- `defaultParams`

Typical `beam` parameters:

```json
{
  "orientation": "horizontal",
  "length": 0.85,
  "thickness": 0.14,
  "intensity": 0.85
}
```

## Example: Discover Recipe Layers

List supported layer types:

```json
{
  "tool": "list_layer_types",
  "arguments": {}
}
```

Inspect one layer type:

```json
{
  "tool": "get_layer_schema",
  "arguments": {
    "type": "gradientRect"
  }
}
```

`get_layer_schema` also returns high-signal summary fields:

- `mode`
- `parameterNames`
- `requiredParameterNames`
- `constraintFields`
- `exampleCount`
- `parameterSemantics`
- `constraints`
- `examples`

## Example: Validate A Recipe First

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

When valid, `validate_recipe` returns:

- `valid`
- `errorCount`
- `readyForGeneration`
- `errors`
- `normalizedRecipe`
- `stats`

## Example: Generate From A Preset

```json
{
  "tool": "generate_texture",
  "arguments": {
    "mode": "preset",
    "preset": "colorRamp",
    "params": {
      "palette": "heat",
      "orientation": "horizontal",
      "thickness": 0.16,
      "padding": 0.08,
      "cornerRadius": 0.03
    },
    "width": 512,
    "height": 128,
    "seed": 7
  }
}
```

`generate_texture` returns structured fields such as:

- `mode`
- `width`
- `height`
- `preset`
- `seed`
- `usedDefaultSeed`
- `recipeLayerCount`
- `currentResultAvailable`

## Example: Generate From A Recipe

```json
{
  "tool": "generate_texture",
  "arguments": {
    "mode": "recipe",
    "recipe": {
      "version": 1,
      "layers": [
        {
          "type": "gradientCircle",
          "center": { "x": 0.5, "y": 0.5 },
          "radius": 0.42,
          "colors": [
            "rgba(255, 245, 210, 0.95)",
            "rgba(255, 180, 80, 0)"
          ]
        },
        {
          "type": "noise",
          "amount": 0.12
        }
      ]
    },
    "width": 512,
    "height": 512,
    "seed": 12
  }
}
```

`export_texture` returns structured fields such as:

- `savedPath`
- `metaPath`
- `width`
- `height`
- `format`
- `sourceMode`
- `preset`
- `seed`
- `metaSaved`

`generate_texture` stores the result as the current in-memory texture state. `export_texture` then writes that current result to disk.

## Example: Export The Current Result

```json
{
  "tool": "export_texture",
  "arguments": {
    "outputPath": "outputs/beam-01.png",
    "format": "png",
    "saveMeta": true
  }
}
```

For JPEG or WebP output:

```json
{
  "tool": "export_texture",
  "arguments": {
    "outputPath": "outputs/panel-01.webp",
    "format": "webp",
    "quality": 0.92,
    "saveMeta": true
  }
}
```

## Guardrails

- Width and height are bounded.
- Total texture area is bounded.
- Total layer count is bounded.
- Output paths must stay inside `workspaceRoot`.
- If `seed` is omitted, a fixed default seed is used so results remain reproducible.

## Status

The package metadata is ready for npm publishing. It can still be used locally through the compiled entry or, after publishing, through `npx -y texture-mcp`.

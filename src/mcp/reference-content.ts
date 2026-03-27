import { DEFAULT_TEXTURE_SEED, MAX_RECIPE_DEPTH, MAX_RECIPE_LAYERS, MAX_TEXTURE_DIMENSION, MAX_TEXTURE_PIXELS } from "../core/limits.js";
import { getLayerSchemaInfo, listLayerCatalog } from "../core/layers.js";
import { getPresetSchemaInfo, listPresetCatalog } from "../core/presets.js";
import type { GetLayerSchemaOutput, GetPresetSchemaOutput } from "../core/types.js";

type ExampleCall = {
  title: string;
  description: string;
  tool: string;
  arguments: Record<string, unknown>;
};

const recipeExamples: ExampleCall[] = [
  {
    title: "Fast Glow Preset",
    description: "Use this when you need a soft light sprite or pickup effect with minimal setup.",
    tool: "generate_texture",
    arguments: {
      mode: "preset",
      preset: "glow",
      params: {
        intensity: 0.9,
        falloff: 0.65
      },
      width: 256,
      height: 256,
      seed: 7
    }
  },
  {
    title: "Ring Shield Preset",
    description: "Use this for shield hits, portal outlines, or target markers.",
    tool: "generate_texture",
    arguments: {
      mode: "preset",
      preset: "ring",
      params: {
        thickness: 0.32,
        softness: 0.28
      },
      width: 512,
      height: 512,
      seed: 12
    }
  },
  {
    title: "Resolve A Preset For Editing",
    description:
      "Use this when a preset is close to what you want, but you still need the compiled recipe for layer-level editing before rendering.",
    tool: "resolve_preset",
    arguments: {
      preset: "beam",
      params: {
        orientation: "horizontal",
        length: 0.9,
        thickness: 0.12,
        intensity: 0.92
      }
    }
  },
  {
    title: "Beam Recipe Validation",
    description: "Validate a custom beam recipe before rendering it.",
    tool: "validate_recipe",
    arguments: {
      recipe: {
        version: 1,
        layers: [
          {
            type: "gradientRect",
            origin: { x: 0.08, y: 0.43 },
            size: { width: 0.84, height: 0.14 },
            direction: "horizontal",
            colors: [
              "rgba(0, 220, 255, 0)",
              "rgba(120, 235, 255, 0.65)",
              "rgba(255, 255, 255, 1)",
              "rgba(120, 235, 255, 0.65)",
              "rgba(0, 220, 255, 0)"
            ]
          },
          {
            type: "blur",
            radius: 0.04
          },
          {
            type: "rect",
            origin: { x: 0.08, y: 0.485 },
            size: { width: 0.84, height: 0.03 },
            color: "rgba(255, 252, 245, 0.9)"
          }
        ]
      }
    }
  },
  {
    title: "Export Current Result",
    description: "Save the current in-memory result after a successful generate step.",
    tool: "export_texture",
    arguments: {
      outputPath: "test-output/examples/beam-01.png",
      format: "png",
      saveMeta: true
    }
  }
];

function toMarkdownList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function toJsonBlock(value: unknown): string {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function getLayerDetails(): GetLayerSchemaOutput[] {
  return listLayerCatalog()
    .map((layer) => getLayerSchemaInfo(layer.type))
    .filter((layer): layer is GetLayerSchemaOutput => layer !== undefined);
}

function getPresetDetails(): GetPresetSchemaOutput[] {
  return listPresetCatalog()
    .map((preset) => getPresetSchemaInfo(preset.name))
    .filter((preset): preset is GetPresetSchemaOutput => preset !== undefined);
}

export function buildLayerReferenceMarkdown(): string {
  const layers = getLayerDetails();
  const summaryRows = [
    "| Type | Category | Scope | Primary parameters | Typical use |",
    "| --- | --- | --- | --- | --- |",
    ...layers.map(
      (layer) =>
        `| \`${layer.type}\` | \`${layer.category}\` | \`${layer.applicationScope}\` | ${layer.primaryParameters.map((item) => `\`${item}\``).join(", ")} | ${layer.commonUses.join(", ")} |`
    )
  ];
  const sections = layers.map((layer) => {
    const example = layer.examples[0] ? toJsonBlock(layer.examples[0]) : "_No example available._";
    const constraints =
      layer.constraints.length > 0
        ? toMarkdownList(layer.constraints.map((constraint) => `\`${constraint.field}\`: ${constraint.description}`))
        : "- No additional field constraints.";

    return [
      `## \`${layer.type}\``,
      "",
      layer.description,
      "",
      "- Structured fields: `applicationScope`, `primaryParameters`, `commonUses`, `parameterSemantics`, `constraints`",
      `- Category: \`${layer.category}\``,
      `- Scope: \`${layer.applicationScope}\``,
      `- Primary parameters: ${layer.primaryParameters.map((item) => `\`${item}\``).join(", ")}`,
      `- Coordinate space: ${layer.coordinateSpace}`,
      "",
      "### Common Uses",
      "",
      toMarkdownList(layer.commonUses),
      "",
      "### Parameter Semantics",
      "",
      toMarkdownList(
        layer.parameterNames.map((name) => `\`${name}\`: ${layer.parameterSemantics[name] ?? "No description."}`)
      ),
      "",
      "### Constraints",
      "",
      constraints,
      "",
      "### Composition Notes",
      "",
      toMarkdownList(layer.compositionNotes),
      "",
      "### Example",
      "",
      example
    ].join("\n");
  });

  return [
    "# Layer Reference",
    "",
    "Stable runtime-generated reference for the current recipe DSL layer types.",
    "",
    "## Summary",
    "",
    ...summaryRows,
    "",
    ...sections
  ].join("\n");
}

export function buildPresetPlaybookMarkdown(): string {
  const presets = getPresetDetails();
  const summaryRows = [
    "| Preset | Primary params | Common uses | Compiles to |",
    "| --- | --- | --- | --- |",
    ...presets.map(
      (preset) =>
        `| \`${preset.name}\` | ${preset.primaryParams.map((item) => `\`${item}\``).join(", ")} | ${preset.commonUses.join(", ")} | ${preset.compilesToLayerTypes.map((item) => `\`${item}\``).join(", ")} |`
    )
  ];
  const sections = presets.map((preset) => [
    `## \`${preset.name}\``,
    "",
    preset.description,
    "",
    "- Structured fields: `primaryParams`, `commonUses`, `compilesToLayerTypes`, `parameterSemantics`, `tuningNotes`",
    `- Primary parameters: ${preset.primaryParams.map((item) => `\`${item}\``).join(", ")}`,
    `- Compiles to layer types: ${preset.compilesToLayerTypes.map((item) => `\`${item}\``).join(", ")}`,
    "",
    "### Default Parameters",
    "",
    toJsonBlock(preset.defaultParams),
    "",
    "### Common Uses",
    "",
    toMarkdownList(preset.commonUses),
    "",
    "### Parameter Semantics",
    "",
    toMarkdownList(
      preset.paramNames.map((name) => `\`${name}\`: ${preset.parameterSemantics[name] ?? "No description."}`)
    ),
    "",
    "### Tuning Notes",
    "",
    toMarkdownList(preset.tuningNotes)
  ].join("\n"));

  return [
    "# Preset Playbook",
    "",
    "Stable runtime-generated guide for choosing and tuning built-in presets.",
    "",
    "Use presets as one main workflow, not as a third separate system:",
    "",
    "- Use `preset-first` when you want the fastest semantic starting point.",
    "- If the preset result is close but still needs layer-level editing, call `resolve_preset` to turn it into a normalized recipe before validating or rendering in `recipe` mode.",
    "- Use `recipe-first` only when you already know that you need exact layer control from the beginning.",
    "",
    "## Summary",
    "",
    ...summaryRows,
    "",
    ...sections
  ].join("\n");
}

export function buildRecipeExamplesMarkdown(): string {
  const sections = recipeExamples.map((example) =>
    [
      `## ${example.title}`,
      "",
      example.description,
      "",
      toJsonBlock({
        tool: example.tool,
        arguments: example.arguments
      })
    ].join("\n")
  );

  return [
    "# Recipe Examples",
    "",
    "Stable runtime-generated MCP call examples for common workflows.",
    "",
    "- Use `preset-first` when you want the fastest semantic result.",
    "- In `preset-first`, use `resolve_preset` only when you need to keep editing the compiled recipe.",
    "- Use `recipe-first` when you already need exact layer ordering and geometry.",
    "- Run `validate_recipe` before `generate_texture` when authoring custom recipes or when continuing from `resolve_preset` output.",
    "- When using `generate_texture` in `recipe` mode, prefer passing the recipe as an object. Valid JSON strings are also accepted for host compatibility.",
    "- Call `export_texture` only after a successful `generate_texture` step in the same session.",
    "",
    ...sections
  ].join("\n");
}

export function buildWorkflowGuardrailsMarkdown(): string {
  return [
    "# Workflow And Guardrails",
    "",
    "Stable runtime-generated guidance for recommended calling order and hard guardrails.",
    "",
    "## Recommended Workflow",
    "",
    "### Preset-first workflow",
    "",
    "1. `list_presets`",
    "2. `get_preset_schema`",
    "3. If you only need a fast result, call `generate_texture` with `mode: \"preset\"`.",
    "4. If you need layer-level editing after choosing a preset, call `resolve_preset` instead.",
    "5. When coming from `resolve_preset`, optionally call `validate_recipe` and then `generate_texture` with `mode: \"recipe\"`.",
    "6. `export_texture`",
    "",
    "### Recipe-first workflow",
    "",
    "1. `list_layer_types`",
    "2. `get_layer_schema`",
    "3. `validate_recipe`",
    "4. `generate_texture` with `mode: \"recipe\"`",
    "5. `export_texture`",
    "",
    "## Simple Choice Rules",
    "",
    "- Use `preset-first` when you want the fastest path to a useful texture.",
    "- Use `recipe-first` when you already know you need exact layer composition control.",
    "- Use `resolve_preset` only as an editable branch inside `preset-first`, not as a third equal workflow.",
    "",
    "## Guardrails",
    "",
    `- If \`seed\` is omitted, the fixed default seed is \`${DEFAULT_TEXTURE_SEED}\`.`,
    `- Width and height must not exceed \`${MAX_TEXTURE_DIMENSION}\` pixels.`,
    `- Total texture area must not exceed \`${MAX_TEXTURE_PIXELS}\` pixels.`,
    `- Recipes must not exceed \`${MAX_RECIPE_LAYERS}\` total layers.`,
    `- Recipe nesting depth must not exceed \`${MAX_RECIPE_DEPTH}\`.`,
    "- `export_texture` only accepts relative output paths that remain inside `workspaceRoot`.",
    "",
    "## Related Resources",
    "",
    "- `texture://docs/layer-reference`",
    "- `texture://docs/preset-playbook`",
    "- `texture://docs/recipe-examples`"
  ].join("\n");
}

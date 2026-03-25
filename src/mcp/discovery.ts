import { buildLayerReferenceMarkdown, buildPresetPlaybookMarkdown, buildRecipeExamplesMarkdown, buildWorkflowGuardrailsMarkdown } from "./reference-content.js";

export type ReferenceResource = {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: "text/markdown";
  text: string;
};

export type WorkflowPromptCatalogItem = {
  name: string;
  title: string;
  description: string;
};

type WorkflowPrompt = WorkflowPromptCatalogItem & {
  text: string;
};

const referenceResources: ReferenceResource[] = [
  {
    uri: "texture://docs/layer-reference",
    name: "layer-reference",
    title: "Layer Reference",
    description: "Runtime-generated reference for the recipe DSL layer types, including scope, primary parameters, and examples.",
    mimeType: "text/markdown",
    text: buildLayerReferenceMarkdown()
  },
  {
    uri: "texture://docs/preset-playbook",
    name: "preset-playbook",
    title: "Preset Playbook",
    description: "Runtime-generated guide for choosing built-in presets, tuning their parameters, and understanding compiled layer types.",
    mimeType: "text/markdown",
    text: buildPresetPlaybookMarkdown()
  },
  {
    uri: "texture://docs/recipe-examples",
    name: "recipe-examples",
    title: "Recipe Examples",
    description: "Runtime-generated MCP call examples for preset mode, recipe mode, validation, and export flows.",
    mimeType: "text/markdown",
    text: buildRecipeExamplesMarkdown()
  },
  {
    uri: "texture://docs/workflow-guardrails",
    name: "workflow-guardrails",
    title: "Workflow And Guardrails",
    description: "Runtime-generated summary of recommended calling order, default seed behavior, output path rules, and rendering limits.",
    mimeType: "text/markdown",
    text: buildWorkflowGuardrailsMarkdown()
  }
];

const workflowPrompts: WorkflowPrompt[] = [
  {
    name: "recommended_preset_workflow",
    title: "Recommended Preset Workflow",
    description: "Guide the caller through the recommended preset-first discovery, generation, and export flow.",
    text: [
      "Use this workflow when a built-in preset is likely to be enough and you want the fastest stable result.",
      "",
      "Recommended call order:",
      "1. `list_presets` to discover candidates.",
      "2. `get_preset_schema` for the selected preset.",
      "3. Start from `defaultParams`, then adjust `primaryParams` using `parameterSemantics`, `commonUses`, and `tuningNotes`.",
      "4. Call `generate_texture` with `mode: \"preset\"`.",
      "5. Call `export_texture` to save the current session result.",
      "",
      "Read these resources when you need more detail:",
      "- `texture://docs/preset-playbook`",
      "- `texture://docs/recipe-examples`",
      "- `texture://docs/workflow-guardrails`"
    ].join("\n")
  },
  {
    name: "recommended_recipe_workflow",
    title: "Recommended Recipe Workflow",
    description: "Guide the caller through the recommended recipe-first discovery, validation, generation, and export flow.",
    text: [
      "Use this workflow when you need exact control over layer ordering, geometry, constraints, or composition notes.",
      "",
      "Recommended call order:",
      "1. `list_layer_types` to discover local draw layers and fullscreen effects.",
      "2. `get_layer_schema` for the layer types you plan to use.",
      "3. Use `applicationScope`, `primaryParameters`, `constraints`, and `compositionNotes` to assemble the recipe.",
      "4. Call `validate_recipe` before rendering.",
      "5. Call `generate_texture` with `mode: \"recipe\"`.",
      "6. Call `export_texture` to save the current session result.",
      "",
      "Read these resources when you need more detail:",
      "- `texture://docs/layer-reference`",
      "- `texture://docs/recipe-examples`",
      "- `texture://docs/workflow-guardrails`"
    ].join("\n")
  }
];

export function listReferenceResources(): Omit<ReferenceResource, "text">[] {
  return referenceResources.map(({ text: _text, ...resource }) => resource);
}

export function readReferenceResource(uri: string): ReferenceResource | undefined {
  return referenceResources.find((resource) => resource.uri === uri);
}

export function listWorkflowPrompts(): WorkflowPromptCatalogItem[] {
  return workflowPrompts.map(({ text: _text, ...prompt }) => prompt);
}

export function getWorkflowPrompt(name: string, args?: Record<string, string>): WorkflowPrompt | undefined {
  if (args && Object.keys(args).length > 0) {
    throw new Error(`Prompt ${name} does not accept arguments.`);
  }

  return workflowPrompts.find((prompt) => prompt.name === name);
}

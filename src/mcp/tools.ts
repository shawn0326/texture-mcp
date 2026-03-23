import type { CallToolResult, ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import { exportTexture } from "../core/export.js";
import { generateTexture } from "../core/generate.js";
import { getLayerSchemaInfo, listLayerCatalog } from "../core/layers.js";
import {
  getPresetSchemaInfo,
  listPresetCatalog
} from "../core/presets.js";
import { validateRecipe } from "../core/validate.js";
import {
  exportTextureInputSchema,
  exportTextureOutputSchema,
  generateTextureInputSchema,
  generateTextureOutputSchema,
  getLayerSchemaInputSchema,
  getLayerSchemaOutputSchema,
  getPresetSchemaInputSchema,
  getPresetSchemaOutputSchema,
  listLayerTypesInputSchema,
  listLayerTypesOutputSchema,
  listPresetsInputSchema,
  listPresetsOutputSchema,
  validateRecipeInputSchema,
  validateRecipeOutputSchema
} from "../core/schema.js";
import {
  type JsonSchemaObject,
  type ExportTextureInput,
  type GenerateTextureInput,
  type GetLayerSchemaInput,
  type GetPresetSchemaInput,
  type ListLayerTypesOutput,
  type ListPresetsOutput
} from "../core/types.js";
import { getCurrentResult, setCurrentResult, type AppState } from "./state.js";

export type TextureToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  execute: (input: unknown) => Promise<CallToolResult> | CallToolResult;
};

function createToolError(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true
  };
}

function createToolSuccess(text: string, structuredContent: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent
  };
}

function logDebug(message: string, details?: Record<string, unknown>): void {
  if (details) {
    console.error(`[texture-mcp] ${message} ${JSON.stringify(details)}`);
    return;
  }

  console.error(`[texture-mcp] ${message}`);
}

function toToolJsonSchema(schema: z.ZodTypeAny): { type: "object"; [key: string]: unknown } {
  const jsonSchema = z.toJSONSchema(schema) as JsonSchemaObject;

  return {
    type: "object",
    ...jsonSchema
  };
}

export function createTextureToolDefinitions(state: AppState): TextureToolDefinition[] {
  return [
    {
      name: "generate_texture",
      title: "Generate Texture",
      description: "Generate a texture result and store it as the current state.",
      inputSchema: generateTextureInputSchema,
      outputSchema: generateTextureOutputSchema,
      execute: async (input) => {
        const parsedInput = input as GenerateTextureInput;
        const generated = generateTexture(parsedInput);

        setCurrentResult(state, {
          recipe: generated.recipe,
          imageBuffer: generated.imageBuffer,
          meta: generated.meta
        });

        return createToolSuccess(
          `Texture generated (${generated.output.width}x${generated.output.height}).`,
          generated.output
        );
      }
    },
    {
      name: "export_texture",
      title: "Export Texture",
      description: "Export the current texture result to a file inside the workspace.",
      inputSchema: exportTextureInputSchema,
      outputSchema: exportTextureOutputSchema,
      execute: async (input) => {
        const parsedInput = input as ExportTextureInput;
        const current = getCurrentResult(state);

        if (!current) {
          return createToolError("No current result is available. Run `generate_texture` first.");
        }

        const exported = await exportTexture(current, state.workspaceRoot, parsedInput);

        return createToolSuccess(exported.message, exported);
      }
    },
    {
      name: "list_layer_types",
      title: "List Layer Types",
      description: "List supported recipe layer types and whether they are draw or effect layers.",
      inputSchema: listLayerTypesInputSchema,
      outputSchema: listLayerTypesOutputSchema,
      execute: async () => {
        const layers: ListLayerTypesOutput["layers"] = listLayerCatalog();

        return createToolSuccess(JSON.stringify(layers, null, 2), { layers });
      }
    },
    {
      name: "get_layer_schema",
      title: "Get Layer Schema",
      description: "Return schema and semantic notes for a specific layer type.",
      inputSchema: getLayerSchemaInputSchema,
      outputSchema: getLayerSchemaOutputSchema,
      execute: async (input) => {
        const parsedInput = input as GetLayerSchemaInput;
        const layerSchema = getLayerSchemaInfo(parsedInput.type);

        if (!layerSchema) {
          return createToolError(`Unknown layer type: ${parsedInput.type}`);
        }

        return createToolSuccess(JSON.stringify(layerSchema, null, 2), layerSchema);
      }
    },
    {
      name: "list_presets",
      title: "List Presets",
      description: "List the placeholder preset catalog.",
      inputSchema: listPresetsInputSchema,
      outputSchema: listPresetsOutputSchema,
      execute: async () => {
        const presets: ListPresetsOutput["presets"] = listPresetCatalog();

        return createToolSuccess(JSON.stringify(presets, null, 2), { presets });
      }
    },
    {
      name: "get_preset_schema",
      title: "Get Preset Schema",
      description: "Return placeholder schema metadata for a preset.",
      inputSchema: getPresetSchemaInputSchema,
      outputSchema: getPresetSchemaOutputSchema,
      execute: async (input) => {
        const parsedInput = input as GetPresetSchemaInput;
        const presetDefinition = getPresetSchemaInfo(parsedInput.preset);

        if (!presetDefinition) {
          return createToolError(`Unknown preset: ${parsedInput.preset}`);
        }

        return createToolSuccess(JSON.stringify(presetDefinition, null, 2), {
          name: presetDefinition.name,
          description: presetDefinition.description,
          defaultParams: presetDefinition.defaultParams,
          schema: presetDefinition.schema
        });
      }
    },
    {
      name: "validate_recipe",
      title: "Validate Recipe",
      description: "Validate a recipe, returning errors or the normalized recipe and stats.",
      inputSchema: validateRecipeInputSchema,
      outputSchema: validateRecipeOutputSchema,
      execute: async (input) => {
        const result = validateRecipe((input as { recipe: unknown }).recipe);
        const text = result.valid
          ? "Recipe is valid."
          : `Recipe is invalid:\n${result.errors.map((error) => `- ${error.path}: ${error.message}`).join("\n")}`;

        return createToolSuccess(text, result);
      }
    }
  ];
}

export function createListToolsResult(tools: TextureToolDefinition[]): ListToolsResult {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: toToolJsonSchema(tool.inputSchema),
      outputSchema: toToolJsonSchema(tool.outputSchema)
    }))
  };
}

export async function executeTextureTool(
  tools: TextureToolDefinition[],
  name: string,
  input: Record<string, unknown> | undefined
): Promise<CallToolResult> {
  logDebug("Tool request received.", { name });

  const tool = tools.find((candidate) => candidate.name === name);

  if (!tool) {
    logDebug("Tool request failed because the tool was not found.", { name });
    return createToolError(`Unknown tool: ${name}`);
  }

  const parsedInput = tool.inputSchema.safeParse(input ?? {});

  if (!parsedInput.success) {
    logDebug("Tool request failed input validation.", {
      name,
      error: parsedInput.error.message
    });
    return createToolError(`Invalid arguments for ${name}: ${parsedInput.error.message}`);
  }

  try {
    const result = await tool.execute(parsedInput.data);
    logDebug("Tool request completed.", {
      name,
      isError: result.isError === true
    });
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logDebug("Tool request threw an unexpected error.", { name, error: message });
    return createToolError(`Unexpected error while running ${name}: ${message}`);
  }
}

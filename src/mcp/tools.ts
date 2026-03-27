import type { CallToolResult, ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import { exportTexture } from "../core/export.js";
import { generateTexture, resolvePreset } from "../core/generate.js";
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
  getWorkspaceInfoInputSchema,
  getWorkspaceInfoOutputSchema,
  resolvePresetInputSchema,
  resolvePresetOutputSchema,
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
  type GetWorkspaceInfoOutput,
  type GetLayerSchemaInput,
  type GetPresetSchemaInput,
  type ListLayerTypesOutput,
  type ListPresetsOutput,
  type ResolvePresetInput
} from "../core/types.js";
import { getCurrentResult, getWorkspaceInfo, setCurrentResult, type AppState } from "./state.js";

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

function formatItemList(items: string[]): string {
  return items.map((item) => `\`${item}\``).join(", ");
}

function logDebug(message: string, details?: Record<string, unknown>): void {
  const debugFlag = process.env.TEXTURE_MCP_DEBUG?.trim().toLowerCase();

  if (debugFlag !== "1" && debugFlag !== "true") {
    return;
  }

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
      name: "get_workspace_info",
      title: "Get Workspace Info",
      description:
        "Return the current `workspaceRoot`, how it was resolved, the server `cwd`, and the export path guardrails used by `export_texture`. Use this during MCP host integration or debugging when you need to confirm where files are allowed to be written.",
      inputSchema: getWorkspaceInfoInputSchema,
      outputSchema: getWorkspaceInfoOutputSchema,
      execute: async () => {
        const workspaceInfo: GetWorkspaceInfoOutput = getWorkspaceInfo(state);

        return createToolSuccess(
          `Workspace info returned. Current \`workspaceRoot\` is \`${workspaceInfo.workspaceRoot}\` from source \`${workspaceInfo.workspaceRootSource}\`. Use this to confirm where \`export_texture\` is allowed to write, especially when the host \`cwd\` or \`TEXTURE_MCP_WORKSPACE\` may differ from your intended project root.`,
          workspaceInfo
        );
      }
    },
    {
      name: "generate_texture",
      title: "Generate Texture",
      description:
        "Render a texture from either a semantic preset or an explicit recipe, then store it as the current in-memory result for this MCP session. Use `mode: \"preset\"` with `list_presets` and `get_preset_schema` for the fastest high-level generation, or `mode: \"recipe\"` with `validate_recipe` for precise layer control. If you want an editable recipe before rendering, call `resolve_preset` first. If `seed` is omitted, a fixed default seed is used so results stay reproducible. Call `export_texture` after this tool when you want to write the current result to disk.",
      inputSchema: generateTextureInputSchema,
      outputSchema: generateTextureOutputSchema,
      execute: async (input) => {
        const parsedInput = input as GenerateTextureInput;
        const generated = generateTexture(parsedInput);
        const modeText = parsedInput.mode === "preset" ? `preset \`${generated.output.preset}\`` : "recipe mode";

        setCurrentResult(state, {
          recipe: generated.recipe,
          imageBuffer: generated.imageBuffer,
          meta: generated.meta
        });

        return createToolSuccess(
          `Texture generated from ${modeText} at ${generated.output.width}x${generated.output.height} with seed ${generated.output.seed}. The result is now stored as the current in-memory texture for this session. Call \`export_texture\` to save it to disk.`,
          generated.output
        );
      }
    },
    {
      name: "export_texture",
      title: "Export Texture",
      description:
        "Write the current generated result to a relative path inside `workspaceRoot`. This tool requires a successful `generate_texture` call earlier in the same MCP session. Absolute paths and paths that escape `workspaceRoot` are rejected. Supports `png`, `jpeg`, and `webp`; `quality` is relevant for lossy formats such as `jpeg` and `webp`.",
      inputSchema: exportTextureInputSchema,
      outputSchema: exportTextureOutputSchema,
      execute: async (input) => {
        const parsedInput = input as ExportTextureInput;
        const current = getCurrentResult(state);

        if (!current) {
          return createToolError(
            "No current result is available. Run `generate_texture` first in this MCP session, then call `export_texture` with a relative path inside `workspaceRoot`. If you need to confirm the current export root, call `get_workspace_info`."
          );
        }

        const exported = await exportTexture(current, state.workspaceRoot, parsedInput);

        return createToolSuccess(
          exported.metaPath
            ? `Texture exported to \`${exported.savedPath}\` as ${exported.format}. Metadata was also written to \`${exported.metaPath}\`.`
            : `Texture exported to \`${exported.savedPath}\` as ${exported.format}.`,
          exported
        );
      }
    },
    {
      name: "list_layer_types",
      title: "List Layer Types",
      description:
        "List the supported recipe DSL layer types with category and short descriptions. Use this as the discovery entry point before `get_layer_schema` when you need to author or inspect recipe-mode textures.",
      inputSchema: listLayerTypesInputSchema,
      outputSchema: listLayerTypesOutputSchema,
      execute: async () => {
        const layers: ListLayerTypesOutput["layers"] = listLayerCatalog();

        return createToolSuccess(
          `Found ${layers.length} layer types: ${formatItemList(layers.map((layer) => layer.type))}. Use each layer's \`applicationScope\`, \`primaryParameters\`, and \`commonUses\` to choose the closest fit, then call \`get_layer_schema\` for detailed semantics and examples.`,
          {
            count: layers.length,
            layers
          }
        );
      }
    },
    {
      name: "get_layer_schema",
      title: "Get Layer Schema",
      description:
        "Return the schema, parameter semantics, constraints, coordinate-space notes, composition notes, and examples for one recipe layer type. Use this before creating or repairing recipe-mode input so the layer matches the expected normalized DSL.",
      inputSchema: getLayerSchemaInputSchema,
      outputSchema: getLayerSchemaOutputSchema,
      execute: async (input) => {
        const parsedInput = input as GetLayerSchemaInput;
        const layerSchema = getLayerSchemaInfo(parsedInput.type);

        if (!layerSchema) {
          return createToolError(
            `Unknown layer type: ${parsedInput.type}. Call \`list_layer_types\` to discover the supported recipe DSL types.`
          );
        }

        return createToolSuccess(
          `Layer schema returned for \`${layerSchema.type}\`. Use \`applicationScope\`, \`primaryParameters\`, \`parameterSemantics\`, \`constraints\`, \`compositionNotes\`, and \`examples\` to build or repair recipe-mode input.`,
          layerSchema
        );
      }
    },
    {
      name: "list_presets",
      title: "List Presets",
      description:
        "List the built-in semantic presets with short descriptions. Use this as the discovery entry point before `get_preset_schema`, `generate_texture` in `preset` mode, or `resolve_preset` when you need an editable compiled recipe.",
      inputSchema: listPresetsInputSchema,
      outputSchema: listPresetsOutputSchema,
      execute: async () => {
        const presets: ListPresetsOutput["presets"] = listPresetCatalog();

        return createToolSuccess(
          `Found ${presets.length} presets: ${formatItemList(presets.map((preset) => preset.name))}. Use each preset's \`commonUses\` and \`primaryParams\` to pick the closest match, then call \`get_preset_schema\` before using \`generate_texture\` in preset mode or \`resolve_preset\` when you need an editable compiled recipe.`,
          {
            count: presets.length,
            presets
          }
        );
      }
    },
    {
      name: "get_preset_schema",
      title: "Get Preset Schema",
      description:
        "Return the schema and default parameters for one built-in preset. Use this to discover valid `params`, defaults, and which fields are still explicitly required before calling `generate_texture` with `mode: \"preset\"` or `resolve_preset` when you want an editable compiled recipe.",
      inputSchema: getPresetSchemaInputSchema,
      outputSchema: getPresetSchemaOutputSchema,
      execute: async (input) => {
        const parsedInput = input as GetPresetSchemaInput;
        const presetDefinition = getPresetSchemaInfo(parsedInput.preset);

        if (!presetDefinition) {
          return createToolError(
            `Unknown preset: ${parsedInput.preset}. Call \`list_presets\` to discover the available built-in presets.`
          );
        }

        return createToolSuccess(
          `Preset schema returned for \`${presetDefinition.name}\`. Start from \`defaultParams\`, check \`requiredParamNames\` for any inputs that still must be provided explicitly, use \`schemaRequiredParamNames\` when you need the raw schema contract, and use \`parameterSemantics\` plus \`tuningNotes\` to adjust only the parameters you need before calling \`generate_texture\` in preset mode. If you need an editable compiled recipe, call \`resolve_preset\` after choosing the params.`,
          presetDefinition
        );
      }
    },
    {
      name: "resolve_preset",
      title: "Resolve Preset",
      description:
        "Resolve a built-in semantic preset into a normalized recipe without rendering or creating a current session result. Use this in preset-first workflows when you want the preset as an editable recipe before `validate_recipe`, `generate_texture` in `recipe` mode, or external tool handoff.",
      inputSchema: resolvePresetInputSchema,
      outputSchema: resolvePresetOutputSchema,
      execute: async (input) => {
        const parsedInput = input as ResolvePresetInput;
        const resolved = resolvePreset(parsedInput);

        return createToolSuccess(
          `Preset \`${resolved.preset}\` was resolved to a normalized recipe with ${resolved.recipeLayerCount} layers. This does not create a current in-memory result. If you want to render it, pass the returned \`recipe\` to \`generate_texture\` with \`mode: "recipe"\`.`,
          resolved
        );
      }
    },
    {
      name: "validate_recipe",
      title: "Validate Recipe",
      description:
        "Validate a recipe without rendering it. Returns `valid` plus readable `errors`, and when validation succeeds also returns `normalizedRecipe` and `stats`. Recommended before `generate_texture` when working in `recipe` mode, including recipes returned from `resolve_preset`.",
      inputSchema: validateRecipeInputSchema,
      outputSchema: validateRecipeOutputSchema,
      execute: async (input) => {
        const result = validateRecipe((input as { recipe: unknown }).recipe);
        const text = result.valid
          ? `Recipe is valid. Use \`normalizedRecipe\` as the canonical object form and \`stats\` for complexity checks, then pass \`normalizedRecipe\` directly to \`generate_texture\` with \`mode: "recipe"\`. Do not JSON-stringify the recipe.`
          : `Recipe is invalid. Review these issues before rendering:\n${result.errors.map((error) => `- ${error.path}: ${error.message}`).join("\n")}\nUse \`get_layer_schema\` for the relevant layer type when you need field-level constraints or examples.`;

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

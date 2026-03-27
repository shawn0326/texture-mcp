import { generateTextureInputSchema, resolvePresetInputSchema, resolvePresetOutputSchema } from "./schema.js";
import { DEFAULT_TEXTURE_SEED } from "./limits.js";
import { getPresetDefinition } from "./presets.js";
import { normalizeRecipe } from "./recipe.js";
import { renderRecipe } from "./renderer.js";
import type {
  GenerateTextureInput,
  GenerateTextureOutput,
  Meta,
  Recipe,
  ResolvePresetInput,
  ResolvePresetOutput
} from "./types.js";

export type GeneratedTexture = {
  recipe: Recipe;
  imageBuffer: Buffer;
  meta: Meta;
  output: GenerateTextureOutput;
};

function resolveSeed(seed?: number): number {
  if (typeof seed === "number") {
    return seed;
  }

  return DEFAULT_TEXTURE_SEED;
}

type ResolvedPreset = {
  presetName: string;
  resolvedParams: Record<string, unknown>;
  recipe: Recipe;
  compilesToLayerTypes: Recipe["layers"][number]["type"][];
};

function resolvePresetDefinition(input: ResolvePresetInput): ResolvedPreset {
  const preset = getPresetDefinition(input.preset);

  if (!preset) {
    throw new Error(`Unknown preset: ${input.preset}`);
  }

  const mergedParams = {
    ...preset.defaultParams,
    ...(input.params ?? {})
  };
  const resolvedParams = preset.schema.parse(mergedParams) as Record<string, unknown>;

  return {
    presetName: preset.name,
    resolvedParams,
    recipe: normalizeRecipe(preset.toRecipe(resolvedParams)),
    compilesToLayerTypes: [...preset.compilesToLayerTypes]
  };
}

function resolveRecipe(input: GenerateTextureInput): {
  recipe: Recipe;
  presetName?: string;
  resolvedParams?: Record<string, unknown>;
} {
  if (input.mode === "recipe") {
    return {
      recipe: normalizeRecipe(input.recipe)
    };
  }

  const resolvedPreset = resolvePresetDefinition({
    preset: input.preset,
    params: input.params
  });

  return {
    recipe: resolvedPreset.recipe,
    presetName: resolvedPreset.presetName,
    resolvedParams: resolvedPreset.resolvedParams
  };
}

export function resolvePreset(input: ResolvePresetInput): ResolvePresetOutput {
  const parsedInput = resolvePresetInputSchema.parse(input) as ResolvePresetInput;
  const resolvedPreset = resolvePresetDefinition(parsedInput);

  return resolvePresetOutputSchema.parse({
    preset: resolvedPreset.presetName,
    resolvedParams: resolvedPreset.resolvedParams,
    recipe: resolvedPreset.recipe,
    recipeLayerCount: resolvedPreset.recipe.layers.length,
    compilesToLayerTypes: resolvedPreset.compilesToLayerTypes,
    message: "Preset resolved to a normalized recipe."
  }) as ResolvePresetOutput;
}

export function generateTexture(input: GenerateTextureInput): GeneratedTexture {
  const parsedInput = generateTextureInputSchema.parse(input) as GenerateTextureInput;
  const usedDefaultSeed = typeof parsedInput.seed !== "number";
  const resolvedSeed = resolveSeed(parsedInput.seed);
  const { recipe, presetName, resolvedParams } = resolveRecipe(parsedInput);

  const meta: Meta = {
    version: 1,
    preset: presetName,
    params: resolvedParams,
    seed: resolvedSeed,
    width: parsedInput.width,
    height: parsedInput.height,
    recipe
  };

  return {
    recipe,
    imageBuffer: renderRecipe(recipe, {
      width: parsedInput.width,
      height: parsedInput.height,
      seed: resolvedSeed
    }),
    meta,
    output: {
      mode: parsedInput.mode,
      width: parsedInput.width,
      height: parsedInput.height,
      preset: presetName,
      seed: resolvedSeed,
      usedDefaultSeed,
      recipeLayerCount: recipe.layers.length,
      currentResultAvailable: true,
      message: "Texture rendered and stored as the current result."
    }
  };
}

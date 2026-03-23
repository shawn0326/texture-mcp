import { generateTextureInputSchema } from "./schema.js";
import { DEFAULT_TEXTURE_SEED } from "./limits.js";
import { getPresetDefinition } from "./presets.js";
import { normalizeRecipe } from "./recipe.js";
import { renderRecipe } from "./renderer.js";
import type {
  GenerateTextureInput,
  GenerateTextureOutput,
  Meta,
  Recipe
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

  const preset = getPresetDefinition(input.preset);

  if (!preset) {
    throw new Error(`Unknown preset: ${input.preset}`);
  }

  const mergedParams = {
    ...preset.defaultParams,
    ...(input.params ?? {})
  };
  const resolvedParams = preset.schema.parse(mergedParams);

  return {
    recipe: normalizeRecipe(preset.toRecipe(resolvedParams)),
    presetName: preset.name,
    resolvedParams
  };
}

export function generateTexture(input: GenerateTextureInput): GeneratedTexture {
  const parsedInput = generateTextureInputSchema.parse(input) as GenerateTextureInput;
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
      width: parsedInput.width,
      height: parsedInput.height,
      preset: presetName,
      seed: resolvedSeed,
      message: "Texture rendered and stored as the current result."
    }
  };
}

import { recipeSchema } from "./schema.js";
import type { LayerSpec, Recipe } from "./types.js";

export type RecipeStats = {
  totalLayers: number;
  leafLayers: number;
  maxDepth: number;
};

function visitLayer(
  layer: LayerSpec,
  depth: number,
  stats: RecipeStats
): void {
  stats.totalLayers += 1;
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  if (layer.type === "group") {
    for (const child of layer.children) {
      visitLayer(child, depth + 1, stats);
    }

    return;
  }

  stats.leafLayers += 1;
}

export function createRecipe(layers: LayerSpec[]): Recipe {
  return recipeSchema.parse({
    version: 1,
    layers
  }) as Recipe;
}

export function normalizeRecipe(recipe: Recipe): Recipe {
  return recipeSchema.parse(recipe) as Recipe;
}

export function cloneRecipe(recipe: Recipe): Recipe {
  return normalizeRecipe(recipe);
}

export function createEmptyRecipe(): Recipe {
  return createRecipe([]);
}

export function getRecipeStats(recipe: Recipe): RecipeStats {
  const normalizedRecipe = normalizeRecipe(recipe);
  const stats: RecipeStats = {
    totalLayers: 0,
    leafLayers: 0,
    maxDepth: 0
  };

  for (const layer of normalizedRecipe.layers) {
    visitLayer(layer, 1, stats);
  }

  return stats;
}

import { getRecipeStats as analyzeRecipeStats } from "./recipe-analysis.js";
import { recipeSchema } from "./schema.js";
import type { RecipeStats } from "./recipe-analysis.js";
import type { LayerSpec, Recipe } from "./types.js";

export type { RecipeStats } from "./recipe-analysis.js";

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

  return analyzeRecipeStats(normalizedRecipe);
}

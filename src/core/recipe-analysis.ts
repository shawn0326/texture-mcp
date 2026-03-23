import type { LayerSpec, Recipe } from "./types.js";

export type RecipeStats = {
  totalLayers: number;
  leafLayers: number;
  maxDepth: number;
};

type LayerFrame = {
  layer: LayerSpec;
  depth: number;
};

export function getRecipeStats(recipe: Recipe | LayerSpec[]): RecipeStats {
  const layers = Array.isArray(recipe) ? recipe : recipe.layers;
  const stats: RecipeStats = {
    totalLayers: 0,
    leafLayers: 0,
    maxDepth: 0
  };
  const stack: LayerFrame[] = layers
    .map((layer) => ({
      layer,
      depth: 1
    }))
    .reverse();

  while (stack.length > 0) {
    const frame = stack.pop() as LayerFrame;

    stats.totalLayers += 1;
    stats.maxDepth = Math.max(stats.maxDepth, frame.depth);

    stats.leafLayers += 1;
  }

  return stats;
}

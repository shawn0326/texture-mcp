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

    if (frame.layer.type === "group") {
      for (let index = frame.layer.children.length - 1; index >= 0; index -= 1) {
        stack.push({
          layer: frame.layer.children[index],
          depth: frame.depth + 1
        });
      }

      continue;
    }

    stats.leafLayers += 1;
  }

  return stats;
}

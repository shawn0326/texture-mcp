import { recipeSchema } from "./schema.js";
import { getRecipeStats as analyzeRecipeStats } from "./recipe-analysis.js";
import type { RecipeStats } from "./recipe-analysis.js";
import type {
  BlurLayer,
  CircleLayer,
  GradientCircleLayer,
  GradientRectLayer,
  LayerSpec,
  NoiseLayer,
  RectLayer,
  Recipe,
  RingLayer
  ,
  TextLayer
} from "./types.js";

export type { RecipeStats } from "./recipe-analysis.js";

function normalizeCornerRadius<T extends RectLayer | GradientRectLayer>(layer: T): T {
  return {
    ...layer,
    cornerRadius: layer.cornerRadius ?? 0,
    rotation: layer.rotation ?? 0
  };
}

function normalizeTextLayer(layer: TextLayer): LayerSpec {
  return {
    ...layer,
    rotation: layer.rotation ?? 0,
    fontFamily: layer.fontFamily ?? "sans-serif",
    fontWeight: layer.fontWeight ?? "normal",
    fontStyle: layer.fontStyle ?? "normal",
    align: layer.align ?? "center",
    verticalAlign: layer.verticalAlign ?? "middle",
    clip: layer.clip ?? true
  };
}

function normalizeLeafLayer(
  layer:
    | CircleLayer
    | RingLayer
    | RectLayer
    | GradientRectLayer
    | GradientCircleLayer
    | NoiseLayer
    | BlurLayer
    | TextLayer
): LayerSpec {
  switch (layer.type) {
    case "rect":
    case "gradientRect":
      return normalizeCornerRadius(layer);
    case "text":
      return normalizeTextLayer(layer);
    default:
      return layer;
  }
}

export function createRecipe(layers: LayerSpec[]): Recipe {
  return recipeSchema.parse({
    version: 1,
    layers: layers.map(normalizeLeafLayer)
  }) as Recipe;
}

export function normalizeRecipe(recipe: Recipe): Recipe {
  const parsedRecipe = recipeSchema.parse(recipe) as Recipe;

  return recipeSchema.parse({
    version: 1,
    layers: parsedRecipe.layers.map(normalizeLeafLayer)
  }) as Recipe;
}

export function cloneRecipe(recipe: Recipe): Recipe {
  return normalizeRecipe(recipe);
}

export function createEmptyRecipe(): Recipe {
  return createRecipe([]);
}

export function getRecipeStats(recipe: Recipe): RecipeStats {
  const parsedRecipe = recipeSchema.parse(recipe) as Recipe;

  return analyzeRecipeStats(parsedRecipe);
}

import * as z from "zod/v4";
import {
  MAX_RECIPE_DEPTH,
  MAX_RECIPE_LAYERS,
  MAX_TEXTURE_DIMENSION,
  MAX_TEXTURE_PIXELS
} from "./limits.js";
import { getRecipeStats } from "./recipe-analysis.js";
import type { LayerSpec } from "./types.js";

export const imageFormatSchema = z.enum(["png", "jpeg", "webp"]);
export const paramsRecordSchema = z.record(z.string(), z.unknown());
export const jsonSchemaObjectSchema = z.record(z.string(), z.unknown());
export const normalizedNumberSchema = z.number().min(0).max(1);
export const cssColorSchema = z.string().min(1);
const textureDimensionSchema = z
  .number()
  .int()
  .positive()
  .max(MAX_TEXTURE_DIMENSION, {
    message: `Texture dimensions must not exceed ${MAX_TEXTURE_DIMENSION} pixels.`
  });

function validateRenderArea(
  value: {
    width: number;
    height: number;
  },
  context: z.RefinementCtx
): void {
  if (value.width * value.height <= MAX_TEXTURE_PIXELS) {
    return;
  }

  context.addIssue({
    code: "custom",
    path: ["width"],
    message: `The requested texture area must not exceed ${MAX_TEXTURE_PIXELS} pixels.`
  });
}

function validateRecipeComplexity(
  value: {
    layers: unknown[];
  },
  context: z.RefinementCtx
): void {
  const stats = getRecipeStats(value.layers as LayerSpec[]);

  if (stats.totalLayers > MAX_RECIPE_LAYERS) {
    context.addIssue({
      code: "custom",
      path: ["layers"],
      message: `Recipes must not exceed ${MAX_RECIPE_LAYERS} total layers.`
    });
  }

  if (stats.maxDepth > MAX_RECIPE_DEPTH) {
    context.addIssue({
      code: "custom",
      path: ["layers"],
      message: `Recipe nesting depth must not exceed ${MAX_RECIPE_DEPTH}.`
    });
  }
}

export const xySchema = z
  .object({
    x: normalizedNumberSchema,
    y: normalizedNumberSchema
  })
  .strict();

const radialGradientLayerSchema = z
  .object({
    type: z.literal("radialGradient"),
    center: xySchema,
    radius: normalizedNumberSchema,
    colors: z.array(cssColorSchema).min(2)
  })
  .strict();

const circleLayerSchema = z
  .object({
    type: z.literal("circle"),
    center: xySchema,
    radius: normalizedNumberSchema,
    color: cssColorSchema
  })
  .strict();

const ringLayerSchema = z
  .object({
    type: z.literal("ring"),
    center: xySchema,
    innerRadius: normalizedNumberSchema,
    outerRadius: normalizedNumberSchema,
    color: cssColorSchema
  })
  .strict()
  .refine((value) => value.outerRadius > value.innerRadius, {
    message: "`outerRadius` must be greater than `innerRadius`.",
    path: ["outerRadius"]
  });

const noiseLayerSchema = z
  .object({
    type: z.literal("noise"),
    amount: normalizedNumberSchema
  })
  .strict();

const blurLayerSchema = z
  .object({
    type: z.literal("blur"),
    radius: normalizedNumberSchema
  })
  .strict();

export const layerSpecSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    radialGradientLayerSchema,
    circleLayerSchema,
    ringLayerSchema,
    noiseLayerSchema,
    blurLayerSchema,
    z
      .object({
        type: z.literal("group"),
        children: z.array(layerSpecSchema).min(1)
      })
      .strict()
  ])
);

export const recipeSchema = z
  .object({
    version: z.literal(1),
    layers: z.array(layerSpecSchema)
  })
  .strict()
  .superRefine(validateRecipeComplexity);

export const renderOptionsSchema = z
  .object({
    width: textureDimensionSchema,
    height: textureDimensionSchema,
    seed: z.number().int().nonnegative().optional()
  })
  .strict()
  .superRefine(validateRenderArea);

export const metaSchema = z
  .object({
    version: z.literal(1),
    preset: z.string().optional(),
    params: paramsRecordSchema.optional(),
    seed: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    recipe: recipeSchema,
    format: imageFormatSchema.optional()
  })
  .strict();

export const generateTextureInputSchema = z
  .object({
    mode: z.enum(["preset", "recipe"]),
    preset: z.string().min(1).optional(),
    params: paramsRecordSchema.optional(),
    recipe: recipeSchema.optional(),
    width: textureDimensionSchema,
    height: textureDimensionSchema,
    seed: z.number().int().nonnegative().optional()
  })
  .strict()
  .superRefine((value, context) => {
    validateRenderArea(value, context);

    if (value.mode === "preset" && !value.preset) {
      context.addIssue({
        code: "custom",
        path: ["preset"],
        message: "`preset` is required when `mode` is `preset`."
      });
    }

    if (value.mode === "recipe" && !value.recipe) {
      context.addIssue({
        code: "custom",
        path: ["recipe"],
        message: "`recipe` is required when `mode` is `recipe`."
      });
    }
  });

export const generateTextureOutputSchema = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    preset: z.string().optional(),
    seed: z.number().int().nonnegative(),
    message: z.string()
  })
  .strict();

export const exportTextureInputSchema = z
  .object({
    outputPath: z.string().min(1),
    format: imageFormatSchema,
    quality: z.number().min(0).max(1).optional(),
    saveMeta: z.boolean().optional()
  })
  .strict();

export const exportTextureOutputSchema = z
  .object({
    savedPath: z.string().min(1),
    metaPath: z.string().min(1).optional(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    format: imageFormatSchema,
    message: z.string()
  })
  .strict();

export const presetCatalogItemSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1)
  })
  .strict();

export const listPresetsInputSchema = z.object({}).strict();

export const listPresetsOutputSchema = z
  .object({
    presets: z.array(presetCatalogItemSchema)
  })
  .strict();

export const getPresetSchemaInputSchema = z
  .object({
    preset: z.string().min(1)
  })
  .strict();

export const getPresetSchemaOutputSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    defaultParams: paramsRecordSchema,
    schema: jsonSchemaObjectSchema
  })
  .strict();

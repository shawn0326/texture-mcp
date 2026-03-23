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
export const size2DSchema = z
  .object({
    width: normalizedNumberSchema,
    height: normalizedNumberSchema
  })
  .strict();
export const cornerRadiusSchema = z.number().min(0).max(0.5);
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

export const gradientCircleLayerSchema = z
  .object({
    type: z.literal("gradientCircle"),
    center: xySchema,
    radius: normalizedNumberSchema,
    colors: z.array(cssColorSchema).min(2)
  })
  .strict();

export const circleLayerSchema = z
  .object({
    type: z.literal("circle"),
    center: xySchema,
    radius: normalizedNumberSchema,
    color: cssColorSchema
  })
  .strict();

export const ringLayerSchema = z
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

export const rectLayerSchema = z
  .object({
    type: z.literal("rect"),
    origin: xySchema,
    size: size2DSchema,
    cornerRadius: cornerRadiusSchema.optional(),
    color: cssColorSchema
  })
  .strict();

export const gradientRectLayerSchema = z
  .object({
    type: z.literal("gradientRect"),
    origin: xySchema,
    size: size2DSchema,
    cornerRadius: cornerRadiusSchema.optional(),
    direction: z.enum(["horizontal", "vertical"]),
    colors: z.array(cssColorSchema).min(2)
  })
  .strict();

export const noiseLayerSchema = z
  .object({
    type: z.literal("noise"),
    amount: normalizedNumberSchema
  })
  .strict();

export const blurLayerSchema = z
  .object({
    type: z.literal("blur"),
    radius: normalizedNumberSchema
  })
  .strict();

export const layerSpecSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    gradientCircleLayerSchema,
    circleLayerSchema,
    ringLayerSchema,
    rectLayerSchema,
    gradientRectLayerSchema,
    noiseLayerSchema,
    blurLayerSchema
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
export const listLayerTypesInputSchema = z.object({}).strict();

export const listPresetsOutputSchema = z
  .object({
    presets: z.array(presetCatalogItemSchema)
  })
  .strict();

export const layerCatalogItemSchema = z
  .object({
    type: z.enum(["gradientCircle", "circle", "ring", "rect", "gradientRect", "noise", "blur"]),
    category: z.enum(["draw", "effect"]),
    description: z.string().min(1)
  })
  .strict();

export const listLayerTypesOutputSchema = z
  .object({
    layers: z.array(layerCatalogItemSchema)
  })
  .strict();

export const getPresetSchemaInputSchema = z
  .object({
    preset: z.string().min(1)
  })
  .strict();

export const getLayerSchemaInputSchema = z
  .object({
    type: z.enum(["gradientCircle", "circle", "ring", "rect", "gradientRect", "noise", "blur"])
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

export const layerSchemaConstraintSchema = z
  .object({
    field: z.string().min(1),
    description: z.string().min(1)
  })
  .strict();

export const getLayerSchemaOutputSchema = z
  .object({
    type: z.enum(["gradientCircle", "circle", "ring", "rect", "gradientRect", "noise", "blur"]),
    category: z.enum(["draw", "effect"]),
    description: z.string().min(1),
    schema: jsonSchemaObjectSchema,
    parameterSemantics: z.record(z.string(), z.string()),
    constraints: z.array(layerSchemaConstraintSchema),
    coordinateSpace: z.string().min(1),
    commonUses: z.array(z.string().min(1)),
    compositionNotes: z.array(z.string().min(1)),
    examples: z.array(layerSpecSchema)
  })
  .strict();

export const validateRecipeInputSchema = z
  .object({
    recipe: z.unknown()
  })
  .strict();

export const validationIssueSchema = z
  .object({
    path: z.string(),
    message: z.string().min(1)
  })
  .strict();

export const validateRecipeOutputSchema = z
  .object({
    valid: z.boolean(),
    errors: z.array(validationIssueSchema),
    normalizedRecipe: recipeSchema.optional(),
    stats: z
      .object({
        totalLayers: z.number().int().nonnegative(),
        leafLayers: z.number().int().nonnegative(),
        maxDepth: z.number().int().nonnegative()
      })
      .strict()
      .optional()
  })
  .strict();

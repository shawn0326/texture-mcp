import * as z from "zod/v4";
import {
  MAX_RECIPE_DEPTH,
  MAX_RECIPE_LAYERS,
  MAX_TEXTURE_DIMENSION,
  MAX_TEXTURE_PIXELS
} from "./limits.js";
import { getColorValidationMessage } from "./color.js";
import { getRecipeStats } from "./recipe-analysis.js";
import type { LayerSpec } from "./types.js";

export const imageFormatSchema = z.enum(["png", "jpeg", "webp"]);
export const workspaceRootSourceSchema = z.enum(["explicit", "env", "cwd"]);
export const paramsRecordSchema = z.record(z.string(), z.unknown());
export const jsonSchemaObjectSchema = z.record(z.string(), z.unknown());
export const layerTypeSchema = z.enum([
  "gradientCircle",
  "circle",
  "ring",
  "rect",
  "gradientRect",
  "noise",
  "blur",
  "text"
]);
export const normalizedNumberSchema = z.number().min(0).max(1);
export const cssColorSchema = z.string().superRefine((value, context) => {
  const validationMessage = getColorValidationMessage(value);

  if (!validationMessage) {
    return;
  }

  context.addIssue({
    code: "custom",
    message: validationMessage
  });
});
export const size2DSchema = z
  .object({
    width: normalizedNumberSchema,
    height: normalizedNumberSchema
  })
  .strict();
export const cornerRadiusSchema = z.number().min(0).max(0.5);
export const rotationDegreesSchema = z.number();
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
    rotation: rotationDegreesSchema.optional(),
    color: cssColorSchema
  })
  .strict();

export const gradientRectLayerSchema = z
  .object({
    type: z.literal("gradientRect"),
    origin: xySchema,
    size: size2DSchema,
    cornerRadius: cornerRadiusSchema.optional(),
    rotation: rotationDegreesSchema.optional(),
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

export const textLayerSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().min(1).max(256),
    origin: xySchema,
    size: size2DSchema,
    rotation: rotationDegreesSchema.optional(),
    color: cssColorSchema,
    fontFamily: z.string().min(1).max(128).optional(),
    fontSize: z.number().positive().max(1).optional(),
    fontWeight: z.enum(["normal", "bold"]).optional(),
    fontStyle: z.enum(["normal", "italic"]).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
    clip: z.boolean().optional()
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
    blurLayerSchema,
    textLayerSchema
  ])
);

export const recipeSchema = z
  .object({
    version: z.literal(1),
    layers: z.array(layerSpecSchema)
  })
  .strict()
  .superRefine(validateRecipeComplexity);

const recipeToolInputSchema = z.unknown().superRefine((value, context) => {
  if (typeof value === "string") {
    context.addIssue({
      code: "custom",
      message: "Recipe must be an object. Pass the recipe object directly, not a JSON string."
    });
    return;
  }

  const parsedRecipe = recipeSchema.safeParse(value);

  if (parsedRecipe.success) {
    return;
  }

  for (const issue of parsedRecipe.error.issues) {
    context.addIssue({
      code: "custom",
      message: issue.message,
      path: issue.path
    });
  }
});

const recipeObjectOnlyInputSchema = z.unknown().superRefine((value, context) => {
  if (typeof value !== "string") {
    return;
  }

  context.addIssue({
    code: "custom",
    message: "Recipe must be an object. Pass the recipe object directly, not a JSON string."
  });
});

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

const generateTexturePresetInputSchema = z
  .object({
    mode: z.literal("preset"),
    preset: z.string().min(1),
    params: paramsRecordSchema.optional(),
    width: textureDimensionSchema,
    height: textureDimensionSchema,
    seed: z.number().int().nonnegative().optional()
  })
  .strict()
  .superRefine(validateRenderArea);

const generateTextureRecipeInputSchema = z
  .object({
    mode: z.literal("recipe"),
    recipe: recipeToolInputSchema,
    width: textureDimensionSchema,
    height: textureDimensionSchema,
    seed: z.number().int().nonnegative().optional()
  })
  .strict()
  .superRefine(validateRenderArea);

export const generateTextureInputSchema = z.discriminatedUnion("mode", [
  generateTexturePresetInputSchema,
  generateTextureRecipeInputSchema
]);

export const generateTextureOutputSchema = z
  .object({
    mode: z.enum(["preset", "recipe"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    preset: z.string().optional(),
    seed: z.number().int().nonnegative(),
    usedDefaultSeed: z.boolean(),
    recipeLayerCount: z.number().int().nonnegative(),
    currentResultAvailable: z.literal(true),
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
    sourceMode: z.enum(["preset", "recipe"]),
    preset: z.string().optional(),
    seed: z.number().int().nonnegative(),
    metaSaved: z.boolean(),
    message: z.string()
  })
  .strict();

export const workspaceExportPolicySchema = z
  .object({
    requiresRelativeOutputPath: z.literal(true),
    mustStayInsideWorkspaceRoot: z.literal(true),
    blocksSymlinkOrJunctionEscape: z.literal(true)
  })
  .strict();

export const getWorkspaceInfoInputSchema = z.object({}).strict();

export const getWorkspaceInfoOutputSchema = z
  .object({
    workspaceRoot: z.string().min(1),
    workspaceRootSource: workspaceRootSourceSchema,
    cwd: z.string().min(1),
    exportPolicy: workspaceExportPolicySchema
  })
  .strict();

export const resolvePresetInputSchema = z
  .object({
    preset: z.string().min(1),
    params: paramsRecordSchema.optional()
  })
  .strict();

export const resolvePresetOutputSchema = z
  .object({
    preset: z.string().min(1),
    resolvedParams: paramsRecordSchema,
    recipe: recipeSchema,
    recipeLayerCount: z.number().int().nonnegative(),
    compilesToLayerTypes: z.array(layerTypeSchema),
    message: z.string()
  })
  .strict();

export const presetCatalogItemSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    primaryParams: z.array(z.string().min(1)),
    commonUses: z.array(z.string().min(1))
  })
  .strict();

export const listPresetsInputSchema = z.object({}).strict();
export const listLayerTypesInputSchema = z.object({}).strict();

export const listPresetsOutputSchema = z
  .object({
    count: z.number().int().nonnegative(),
    presets: z.array(presetCatalogItemSchema)
  })
  .strict();

export const layerCatalogItemSchema = z
  .object({
    type: layerTypeSchema,
    category: z.enum(["draw", "effect"]),
    description: z.string().min(1),
    primaryParameters: z.array(z.string().min(1)),
    commonUses: z.array(z.string().min(1)),
    applicationScope: z.enum(["local", "fullscreen"])
  })
  .strict();

export const listLayerTypesOutputSchema = z
  .object({
    count: z.number().int().nonnegative(),
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
    type: layerTypeSchema
  })
  .strict();

export const getPresetSchemaOutputSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    mode: z.literal("preset"),
    paramCount: z.number().int().nonnegative(),
    paramNames: z.array(z.string().min(1)),
    requiredParamNames: z.array(z.string().min(1)),
    schemaRequiredParamNames: z.array(z.string().min(1)),
    defaultParamNames: z.array(z.string().min(1)),
    defaultParams: paramsRecordSchema,
    parameterSemantics: z.record(z.string(), z.string()),
    primaryParams: z.array(z.string().min(1)),
    commonUses: z.array(z.string().min(1)),
    tuningNotes: z.array(z.string().min(1)),
    compilesToLayerTypes: z.array(layerTypeSchema),
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
    type: layerTypeSchema,
    category: z.enum(["draw", "effect"]),
    description: z.string().min(1),
    mode: z.literal("recipe"),
    primaryParameters: z.array(z.string().min(1)),
    parameterNames: z.array(z.string().min(1)),
    requiredParameterNames: z.array(z.string().min(1)),
    constraintFields: z.array(z.string().min(1)),
    exampleCount: z.number().int().nonnegative(),
    schema: jsonSchemaObjectSchema,
    parameterSemantics: z.record(z.string(), z.string()),
    constraints: z.array(layerSchemaConstraintSchema),
    applicationScope: z.enum(["local", "fullscreen"]),
    coordinateSpace: z.string().min(1),
    commonUses: z.array(z.string().min(1)),
    compositionNotes: z.array(z.string().min(1)),
    examples: z.array(layerSpecSchema)
  })
  .strict();

export const validateRecipeInputSchema = z
  .object({
    recipe: recipeObjectOnlyInputSchema
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
    errorCount: z.number().int().nonnegative(),
    readyForGeneration: z.boolean(),
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

import type { ZodType } from "zod/v4";

export type JsonSchemaObject = {
  [key: string]: unknown;
};

export type ImageFormat = "png" | "jpeg" | "webp";

export type XY = {
  x: number;
  y: number;
};

export type Size2D = {
  width: number;
  height: number;
};

export type GradientCircleLayer = {
  type: "gradientCircle";
  center: XY;
  radius: number;
  colors: string[];
};

export type CircleLayer = {
  type: "circle";
  center: XY;
  radius: number;
  color: string;
};

export type RingLayer = {
  type: "ring";
  center: XY;
  innerRadius: number;
  outerRadius: number;
  color: string;
};

export type RectLayer = {
  type: "rect";
  origin: XY;
  size: Size2D;
  cornerRadius?: number;
  color: string;
};

export type GradientRectDirection = "horizontal" | "vertical";

export type GradientRectLayer = {
  type: "gradientRect";
  origin: XY;
  size: Size2D;
  cornerRadius?: number;
  direction: GradientRectDirection;
  colors: string[];
};

export type NoiseLayer = {
  type: "noise";
  amount: number;
};

export type BlurLayer = {
  type: "blur";
  radius: number;
};

export type LayerSpec =
  | GradientCircleLayer
  | CircleLayer
  | RingLayer
  | RectLayer
  | GradientRectLayer
  | NoiseLayer
  | BlurLayer;

export type Recipe = {
  version: 1;
  layers: LayerSpec[];
};

export type RenderOptions = {
  width: number;
  height: number;
  seed?: number;
};

export type Meta = {
  version: 1;
  preset?: string;
  params?: Record<string, unknown>;
  seed: number;
  width: number;
  height: number;
  recipe: Recipe;
  format?: ImageFormat;
};

export type PresetDefinition<TParams extends Record<string, unknown> = Record<string, unknown>> = {
  name: string;
  description: string;
  schema: ZodType<TParams>;
  defaultParams: TParams;
  toRecipe(params: TParams): Recipe;
};

export type PresetCatalogItem = {
  name: string;
  description: string;
};

export type PresetSchemaInfo = {
  name: string;
  description: string;
  defaultParams: Record<string, unknown>;
  schema: JsonSchemaObject;
};

export type LayerCategory = "draw" | "effect";

export type LayerCatalogItem = {
  type: LayerSpec["type"];
  category: LayerCategory;
  description: string;
};

export type LayerSchemaConstraint = {
  field: string;
  description: string;
};

export type LayerSchemaInfo = {
  type: LayerSpec["type"];
  category: LayerCategory;
  description: string;
  schema: JsonSchemaObject;
  parameterSemantics: Record<string, string>;
  constraints: LayerSchemaConstraint[];
  coordinateSpace: string;
  commonUses: string[];
  compositionNotes: string[];
  examples: LayerSpec[];
};

export type ListLayerTypesOutput = {
  layers: LayerCatalogItem[];
};

export type GetLayerSchemaInput = {
  type: LayerSpec["type"];
};

export type GetLayerSchemaOutput = LayerSchemaInfo;

export type ValidateRecipeInput = {
  recipe: unknown;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidateRecipeOutput = {
  valid: boolean;
  errors: ValidationIssue[];
  normalizedRecipe?: Recipe;
  stats?: {
    totalLayers: number;
    leafLayers: number;
    maxDepth: number;
  };
};

export type GenerateTextureInput =
  | {
      mode: "preset";
      preset: string;
      params?: Record<string, unknown>;
      width: number;
      height: number;
      seed?: number;
    }
  | {
      mode: "recipe";
      recipe: Recipe;
      width: number;
      height: number;
      seed?: number;
    };

export type GenerateTextureOutput = {
  width: number;
  height: number;
  preset?: string;
  seed: number;
  message: string;
};

export type ExportTextureInput = {
  outputPath: string;
  format: ImageFormat;
  quality?: number;
  saveMeta?: boolean;
};

export type ExportTextureOutput = {
  savedPath: string;
  metaPath?: string;
  width: number;
  height: number;
  format: ImageFormat;
  message: string;
};

export type ListPresetsOutput = {
  presets: PresetCatalogItem[];
};

export type GetPresetSchemaInput = {
  preset: string;
};

export type GetPresetSchemaOutput = PresetSchemaInfo;

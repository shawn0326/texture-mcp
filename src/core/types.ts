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
  rotation?: number;
  color: string;
};

export type GradientRectDirection = "horizontal" | "vertical";

export type GradientRectLayer = {
  type: "gradientRect";
  origin: XY;
  size: Size2D;
  cornerRadius?: number;
  rotation?: number;
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

export type TextAlign = "left" | "center" | "right";

export type TextVerticalAlign = "top" | "middle" | "bottom";

export type TextFontWeight = "normal" | "bold";

export type TextFontStyle = "normal" | "italic";

export type TextLayer = {
  type: "text";
  text: string;
  origin: XY;
  size: Size2D;
  rotation?: number;
  color: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: TextFontWeight;
  fontStyle?: TextFontStyle;
  align?: TextAlign;
  verticalAlign?: TextVerticalAlign;
  clip?: boolean;
};

export type LayerSpec =
  | GradientCircleLayer
  | CircleLayer
  | RingLayer
  | RectLayer
  | GradientRectLayer
  | NoiseLayer
  | BlurLayer
  | TextLayer;

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
  primaryParams: string[];
  parameterSemantics: Record<string, string>;
  commonUses: string[];
  tuningNotes: string[];
  compilesToLayerTypes: LayerSpec["type"][];
  toRecipe(params: TParams): Recipe;
};

export type PresetCatalogItem = {
  name: string;
  description: string;
  primaryParams: string[];
  commonUses: string[];
};

export type PresetSchemaInfo = {
  name: string;
  description: string;
  mode: "preset";
  paramCount: number;
  paramNames: string[];
  requiredParamNames: string[];
  schemaRequiredParamNames: string[];
  defaultParamNames: string[];
  defaultParams: Record<string, unknown>;
  parameterSemantics: Record<string, string>;
  primaryParams: string[];
  commonUses: string[];
  tuningNotes: string[];
  compilesToLayerTypes: LayerSpec["type"][];
  schema: JsonSchemaObject;
};

export type LayerCategory = "draw" | "effect";
export type LayerApplicationScope = "local" | "fullscreen";

export type LayerCatalogItem = {
  type: LayerSpec["type"];
  category: LayerCategory;
  description: string;
  primaryParameters: string[];
  commonUses: string[];
  applicationScope: LayerApplicationScope;
};

export type LayerSchemaConstraint = {
  field: string;
  description: string;
};

export type LayerSchemaInfo = {
  type: LayerSpec["type"];
  category: LayerCategory;
  description: string;
  mode: "recipe";
  primaryParameters: string[];
  parameterNames: string[];
  requiredParameterNames: string[];
  constraintFields: string[];
  exampleCount: number;
  schema: JsonSchemaObject;
  parameterSemantics: Record<string, string>;
  constraints: LayerSchemaConstraint[];
  applicationScope: LayerApplicationScope;
  coordinateSpace: string;
  commonUses: string[];
  compositionNotes: string[];
  examples: LayerSpec[];
};

export type ListLayerTypesOutput = {
  count: number;
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
  errorCount: number;
  readyForGeneration: boolean;
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
  mode: "preset" | "recipe";
  width: number;
  height: number;
  preset?: string;
  seed: number;
  usedDefaultSeed: boolean;
  recipeLayerCount: number;
  currentResultAvailable: true;
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
  sourceMode: "preset" | "recipe";
  preset?: string;
  seed: number;
  metaSaved: boolean;
  message: string;
};

export type WorkspaceRootSource = "explicit" | "env" | "cwd";

export type WorkspaceExportPolicy = {
  requiresRelativeOutputPath: true;
  mustStayInsideWorkspaceRoot: true;
  blocksSymlinkOrJunctionEscape: true;
};

export type GetWorkspaceInfoInput = Record<string, never>;

export type GetWorkspaceInfoOutput = {
  workspaceRoot: string;
  workspaceRootSource: WorkspaceRootSource;
  cwd: string;
  exportPolicy: WorkspaceExportPolicy;
};

export type ListPresetsOutput = {
  count: number;
  presets: PresetCatalogItem[];
};

export type GetPresetSchemaInput = {
  preset: string;
};

export type GetPresetSchemaOutput = PresetSchemaInfo;

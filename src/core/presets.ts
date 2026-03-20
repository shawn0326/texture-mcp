import * as z from "zod/v4";
import { createRecipe } from "./recipe.js";
import type {
  JsonSchemaObject,
  PresetCatalogItem,
  PresetDefinition,
  PresetSchemaInfo,
  Recipe
} from "./types.js";

const glowParamsSchema = z
  .object({
    intensity: z.number().min(0).max(1),
    falloff: z.number().min(0).max(1)
  })
  .strict();

const ringParamsSchema = z
  .object({
    thickness: z.number().min(0).max(1),
    softness: z.number().min(0).max(1)
  })
  .strict();

const smokeParamsSchema = z
  .object({
    density: z.number().min(0).max(1),
    turbulence: z.number().min(0).max(1)
  })
  .strict();

type GlowParams = z.infer<typeof glowParamsSchema>;
type RingParams = z.infer<typeof ringParamsSchema>;
type SmokeParams = z.infer<typeof smokeParamsSchema>;

function createGlowRecipe(params: GlowParams): Recipe {
  return createRecipe([
    {
      type: "radialGradient",
      center: { x: 0.5, y: 0.5 },
      radius: 0.2 + params.falloff * 0.5,
      colors: [
        `rgba(255, 245, 200, ${Math.max(0.2, params.intensity).toFixed(3)})`,
        "rgba(255, 200, 120, 0)"
      ]
    },
    {
      type: "noise",
      amount: Math.min(1, 0.05 + params.intensity * 0.15)
    }
  ]);
}

function createRingRecipe(params: RingParams): Recipe {
  const innerRadius = Math.max(0.05, 0.25 - params.thickness * 0.15);
  const outerRadius = Math.min(0.95, innerRadius + 0.1 + params.thickness * 0.35);

  return createRecipe([
    {
      type: "ring",
      center: { x: 0.5, y: 0.5 },
      innerRadius,
      outerRadius,
      color: `rgba(200, 235, 255, ${(0.45 + params.softness * 0.35).toFixed(3)})`
    },
    {
      type: "blur",
      radius: Math.min(1, 0.02 + params.softness * 0.2)
    }
  ]);
}

function createSmokeRecipe(params: SmokeParams): Recipe {
  return createRecipe([
    {
      type: "noise",
      amount: Math.min(1, 0.2 + params.density * 0.5)
    },
    {
      type: "blur",
      radius: Math.min(1, 0.08 + params.turbulence * 0.3)
    },
    {
      type: "circle",
      center: { x: 0.5, y: 0.5 },
      radius: 0.3 + params.density * 0.2,
      color: `rgba(210, 215, 225, ${(0.12 + params.density * 0.25).toFixed(3)})`
    }
  ]);
}

export const presetDefinitions: PresetDefinition[] = [
  {
    name: "glow",
    description: "Soft center glow with a little grain.",
    schema: glowParamsSchema,
    defaultParams: { intensity: 0.8, falloff: 0.5 },
    toRecipe: createGlowRecipe
  },
  {
    name: "ring",
    description: "Circular ring with optional softness.",
    schema: ringParamsSchema,
    defaultParams: { thickness: 0.2, softness: 0.1 },
    toRecipe: createRingRecipe
  },
  {
    name: "smoke",
    description: "Diffuse smoky texture with blur and noise.",
    schema: smokeParamsSchema,
    defaultParams: { density: 0.6, turbulence: 0.4 },
    toRecipe: createSmokeRecipe
  }
];

function toSerializableSchema(schema: z.ZodTypeAny): JsonSchemaObject {
  return z.toJSONSchema(schema) as JsonSchemaObject;
}

export function listPresetCatalog(): PresetCatalogItem[] {
  return presetDefinitions.map(({ name, description }) => ({
    name,
    description
  }));
}

export function getPresetDefinition(name: string): PresetDefinition | undefined {
  return presetDefinitions.find((preset) => preset.name === name);
}

export function getPresetSchemaInfo(name: string): PresetSchemaInfo | undefined {
  const preset = getPresetDefinition(name);

  if (!preset) {
    return undefined;
  }

  return {
    name: preset.name,
    description: preset.description,
    defaultParams: preset.defaultParams,
    schema: toSerializableSchema(preset.schema)
  };
}

import * as z from "zod/v4";
import { createRecipe } from "./recipe.js";
import type {
  JsonSchemaObject,
  PresetCatalogItem,
  PresetDefinition,
  PresetSchemaInfo,
  Recipe
} from "./types.js";

const panelParamsSchema = z
  .object({
    width: z.number().min(0.1).max(1),
    height: z.number().min(0.08).max(1),
    cornerRadius: z.number().min(0).max(0.5),
    glow: z.number().min(0).max(1)
  })
  .strict();

const beamParamsSchema = z
  .object({
    orientation: z.enum(["horizontal", "vertical"]),
    length: z.number().min(0.2).max(1),
    thickness: z.number().min(0.02).max(0.5),
    intensity: z.number().min(0).max(1)
  })
  .strict();

const colorRampParamsSchema = z
  .object({
    palette: z.enum(["heat", "fire", "cool", "grayscale"]),
    orientation: z.enum(["horizontal", "vertical"]),
    thickness: z.number().min(0.02).max(0.4),
    padding: z.number().min(0).max(0.2),
    cornerRadius: z.number().min(0).max(0.5)
  })
  .strict();

const glowParamsSchema = z
  .object({
    intensity: z.number().min(0).max(1),
    falloff: z.number().min(0).max(1)
  })
  .strict();

const flareParamsSchema = z
  .object({
    coreSize: z.number().min(0.04).max(0.26),
    intensity: z.number().min(0).max(1),
    falloff: z.number().min(0).max(1),
    heat: z.number().min(0).max(1),
    softness: z.number().min(0).max(1)
  })
  .strict();

const softMaskParamsSchema = z
  .object({
    shape: z.enum(["circle", "band", "rect"]),
    softness: z.number().min(0).max(1),
    radius: z.number().min(0.08).max(0.48),
    thickness: z.number().min(0.04).max(0.8),
    width: z.number().min(0.08).max(1),
    height: z.number().min(0.08).max(1),
    orientation: z.enum(["horizontal", "vertical"]),
    cornerRadius: z.number().min(0).max(0.5)
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

const shockwaveParamsSchema = z
  .object({
    radius: z.number().min(0.12).max(0.6),
    thickness: z.number().min(0.02).max(0.3),
    softness: z.number().min(0).max(1),
    intensity: z.number().min(0).max(1),
    innerGlow: z.number().min(0).max(1)
  })
  .strict();

type GlowParams = z.infer<typeof glowParamsSchema>;
type FlareParams = z.infer<typeof flareParamsSchema>;
type SoftMaskParams = z.infer<typeof softMaskParamsSchema>;
type RingParams = z.infer<typeof ringParamsSchema>;
type SmokeParams = z.infer<typeof smokeParamsSchema>;
type ShockwaveParams = z.infer<typeof shockwaveParamsSchema>;
type PanelParams = z.infer<typeof panelParamsSchema>;
type BeamParams = z.infer<typeof beamParamsSchema>;
type ColorRampParams = z.infer<typeof colorRampParamsSchema>;

const colorRampPalettes: Record<ColorRampParams["palette"], string[]> = {
  heat: ["#2a00ff", "#00c8ff", "#00ff85", "#fff200", "#ff7a00", "#ff1a1a"],
  fire: ["#1a0a00", "#661100", "#cc2200", "#ff6a00", "#ffd000", "#fff4cc"],
  cool: ["#071b3a", "#0b4f8a", "#00a6ff", "#64f0ff", "#f3fdff"],
  grayscale: ["#000000", "#555555", "#aaaaaa", "#ffffff"]
};

function createCenteredOrigin(width: number, height: number): { x: number; y: number } {
  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2
  };
}

function clampNormalized(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createGlowRecipe(params: GlowParams): Recipe {
  return createRecipe([
    {
      type: "gradientCircle",
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

function createFlareRecipe(params: FlareParams): Recipe {
  const haloRadius = Math.min(0.9, params.coreSize + 0.16 + params.falloff * 0.28);
  const midRadius = Math.min(0.78, params.coreSize + 0.05 + params.falloff * 0.12);
  const coreRadius = Math.max(0.02, params.coreSize * (0.65 + params.intensity * 0.35));
  const cool = 1 - params.heat;
  const warmRed = Math.round(255 - cool * 24);
  const warmGreen = Math.round(188 + params.heat * 42 - cool * 22);
  const warmBlue = Math.round(120 + cool * 70 - params.heat * 18);
  const outerRed = Math.round(255 - cool * 40);
  const outerGreen = Math.round(118 + params.heat * 34 + cool * 10);
  const outerBlue = Math.round(42 + cool * 58);

  return createRecipe([
    {
      type: "gradientCircle",
      center: { x: 0.5, y: 0.5 },
      radius: haloRadius,
      colors: [
        `rgba(255, 255, 255, ${(0.26 + params.intensity * 0.26).toFixed(3)})`,
        `rgba(${warmRed}, ${warmGreen}, ${warmBlue}, ${(0.14 + params.intensity * 0.2).toFixed(3)})`,
        `rgba(${outerRed}, ${outerGreen}, ${outerBlue}, 0)`
      ]
    },
    {
      type: "gradientCircle",
      center: { x: 0.5, y: 0.5 },
      radius: midRadius,
      colors: [
        `rgba(255, 252, 245, ${(0.42 + params.intensity * 0.28).toFixed(3)})`,
        `rgba(${warmRed}, ${warmGreen}, ${warmBlue}, ${(0.16 + params.heat * 0.14).toFixed(3)})`,
        "rgba(255, 210, 120, 0)"
      ]
    },
    {
      type: "circle",
      center: { x: 0.5, y: 0.5 },
      radius: coreRadius,
      color: `rgba(255, 250, 240, ${(0.72 + params.intensity * 0.24).toFixed(3)})`
    },
    {
      type: "blur",
      radius: Math.min(0.16, 0.012 + params.softness * 0.08 + params.intensity * 0.012)
    }
  ]);
}

function createSoftMaskRecipe(params: SoftMaskParams): Recipe {
  const blurRadius = Math.min(0.18, 0.01 + params.softness * 0.12);
  const maskColor = "rgba(255, 255, 255, 1)";

  if (params.shape === "circle") {
    return createRecipe([
      {
        type: "circle",
        center: { x: 0.5, y: 0.5 },
        radius: params.radius,
        color: maskColor
      },
      {
        type: "blur",
        radius: blurRadius
      }
    ]);
  }

  if (params.shape === "band") {
    const size =
      params.orientation === "horizontal"
        ? { width: params.width, height: params.thickness }
        : { width: params.thickness, height: params.height };
    const origin = createCenteredOrigin(size.width, size.height);

    return createRecipe([
      {
        type: "rect",
        origin,
        size,
        cornerRadius: 0.5,
        color: maskColor
      },
      {
        type: "blur",
        radius: blurRadius
      }
    ]);
  }

  const origin = createCenteredOrigin(params.width, params.height);

  return createRecipe([
    {
      type: "rect",
      origin,
      size: { width: params.width, height: params.height },
      cornerRadius: params.cornerRadius,
      color: maskColor
    },
    {
      type: "blur",
      radius: blurRadius
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

function createShockwaveRecipe(params: ShockwaveParams): Recipe {
  const innerRadius = Math.max(0.04, params.radius - params.thickness * 0.5);
  const outerRadius = Math.min(0.98, params.radius + params.thickness * 0.5);
  const innerGlowRadius = Math.max(0.06, innerRadius * (0.9 + params.innerGlow * 0.05));
  const ringAlpha = 0.3 + params.intensity * 0.55;
  const innerGlowAlpha = 0.05 + params.innerGlow * 0.22 + params.intensity * 0.08;

  return createRecipe([
    {
      type: "gradientCircle",
      center: { x: 0.5, y: 0.5 },
      radius: innerGlowRadius,
      colors: [
        `rgba(255, 255, 255, ${innerGlowAlpha.toFixed(3)})`,
        `rgba(130, 225, 255, ${(innerGlowAlpha * 0.45).toFixed(3)})`,
        "rgba(130, 225, 255, 0)"
      ]
    },
    {
      type: "ring",
      center: { x: 0.5, y: 0.5 },
      innerRadius,
      outerRadius,
      color: `rgba(195, 240, 255, ${ringAlpha.toFixed(3)})`
    },
    {
      type: "blur",
      radius: Math.min(0.18, 0.015 + params.softness * 0.12 + params.intensity * 0.01)
    }
  ]);
}

function createPanelRecipe(params: PanelParams): Recipe {
  const origin = createCenteredOrigin(params.width, params.height);
  const glowPadding = 0.02 + params.glow * 0.05;
  const glowWidth = clampNormalized(params.width + glowPadding * 2);
  const glowHeight = clampNormalized(params.height + glowPadding * 2);
  const glowOrigin = createCenteredOrigin(glowWidth, glowHeight);

  return createRecipe([
    {
      type: "rect",
      origin: glowOrigin,
      size: { width: glowWidth, height: glowHeight },
      cornerRadius: Math.min(0.5, params.cornerRadius + glowPadding * 0.4),
      color: `rgba(80, 180, 255, ${(0.1 + params.glow * 0.25).toFixed(3)})`
    },
    {
      type: "blur",
      radius: Math.min(0.12, 0.02 + params.glow * 0.05)
    },
    {
      type: "gradientRect",
      origin,
      size: { width: params.width, height: params.height },
      cornerRadius: params.cornerRadius,
      direction: "vertical",
      colors: [
        `rgba(220, 245, 255, ${(0.2 + params.glow * 0.15).toFixed(3)})`,
        "rgba(55, 110, 180, 0.68)",
        "rgba(18, 32, 58, 0.92)"
      ]
    }
  ]);
}

function createBeamRecipe(params: BeamParams): Recipe {
  const size =
    params.orientation === "horizontal"
      ? { width: params.length, height: params.thickness }
      : { width: params.thickness, height: params.length };
  const origin = createCenteredOrigin(size.width, size.height);
  const fadeDirection = params.orientation === "horizontal" ? "vertical" : "horizontal";
  const coreSize =
    params.orientation === "horizontal"
      ? { width: params.length, height: Math.max(0.01, params.thickness * (0.18 + params.intensity * 0.18)) }
      : { width: Math.max(0.01, params.thickness * (0.18 + params.intensity * 0.18)), height: params.length };
  const coreOrigin = createCenteredOrigin(coreSize.width, coreSize.height);

  return createRecipe([
    {
      type: "gradientRect",
      origin,
      size,
      direction: fadeDirection,
      colors: [
        "rgba(0, 220, 255, 0)",
        `rgba(90, 230, 255, ${(0.2 + params.intensity * 0.25).toFixed(3)})`,
        `rgba(255, 255, 255, ${(0.45 + params.intensity * 0.3).toFixed(3)})`,
        `rgba(90, 230, 255, ${(0.2 + params.intensity * 0.25).toFixed(3)})`,
        "rgba(0, 220, 255, 0)"
      ]
    },
    {
      type: "blur",
      radius: Math.min(0.12, 0.02 + params.intensity * 0.05)
    },
    {
      type: "rect",
      origin: coreOrigin,
      size: coreSize,
      color: `rgba(255, 252, 245, ${(0.4 + params.intensity * 0.35).toFixed(3)})`
    }
  ]);
}

function createColorRampRecipe(params: ColorRampParams): Recipe {
  const colors = colorRampPalettes[params.palette];
  const size =
    params.orientation === "horizontal"
      ? { width: 1 - params.padding * 2, height: params.thickness }
      : { width: params.thickness, height: 1 - params.padding * 2 };
  const origin =
    params.orientation === "horizontal"
      ? { x: params.padding, y: (1 - params.thickness) / 2 }
      : { x: (1 - params.thickness) / 2, y: params.padding };

  return createRecipe([
    {
      type: "gradientRect",
      origin,
      size,
      cornerRadius: params.cornerRadius,
      direction: params.orientation,
      colors
    }
  ]);
}

export const presetDefinitions: PresetDefinition[] = [
  {
    name: "glow",
    description: "Soft center glow with a little grain.",
    schema: glowParamsSchema,
    defaultParams: { intensity: 0.8, falloff: 0.5 },
    primaryParams: ["intensity", "falloff"],
    parameterSemantics: {
      intensity: "Controls core brightness and slightly increases the grain amount.",
      falloff: "Controls how far the glow extends from the center."
    },
    commonUses: ["magic sparks", "pickup glows", "small light sprites"],
    tuningNotes: [
      "Increase `intensity` for a brighter core and slightly more grain.",
      "Increase `falloff` for a wider and softer glow radius."
    ],
    compilesToLayerTypes: ["gradientCircle", "noise"],
    toRecipe: createGlowRecipe
  },
  {
    name: "flare",
    description: "Bright energy flare with a hot halo, crisp core, and soft bloom.",
    schema: flareParamsSchema,
    defaultParams: {
      coreSize: 0.11,
      intensity: 0.9,
      falloff: 0.55,
      heat: 0.8,
      softness: 0.35
    },
    primaryParams: ["coreSize", "intensity", "falloff", "heat"],
    parameterSemantics: {
      coreSize: "Controls the size of the bright center core before bloom is applied.",
      intensity: "Controls overall brightness for both the core and surrounding halo.",
      falloff: "Controls how far the flare halo extends outward from the center.",
      heat: "Shifts the flare palette toward hotter amber tones or cooler pale tones.",
      softness: "Controls the amount of final blur used to bloom the flare."
    },
    commonUses: ["energy flares", "impact sparks", "pickup sprites", "bright spell cores"],
    tuningNotes: [
      "Increase `coreSize` when you want a chunkier central light sprite instead of a pin-hot point.",
      "Increase `falloff` to push more of the flare energy into the outer halo.",
      "Increase `heat` for warmer amber highlights; lower it for paler cooler light.",
      "Increase `softness` when you want the preset to feel bloomier and less graphic."
    ],
    compilesToLayerTypes: ["gradientCircle", "circle", "blur"],
    toRecipe: createFlareRecipe
  },
  {
    name: "softMask",
    description: "Soft grayscale mask sprite for particles, fades, and shader helper textures.",
    schema: softMaskParamsSchema,
    defaultParams: {
      shape: "circle",
      softness: 0.45,
      radius: 0.3,
      thickness: 0.2,
      width: 0.82,
      height: 0.4,
      orientation: "horizontal",
      cornerRadius: 0.08
    },
    primaryParams: ["shape", "softness", "radius", "thickness", "orientation"],
    parameterSemantics: {
      shape: "Selects whether the mask is built as a circular sprite, a centered band, or a rounded rectangle.",
      softness: "Controls the blur radius used to feather the mask edge after the base shape is drawn.",
      radius: "Controls the circle radius when `shape` is `circle`.",
      thickness: "Controls the narrow dimension of the band when `shape` is `band`.",
      width: "Controls the mask width when `shape` is `band` or `rect`.",
      height: "Controls the mask height when `shape` is `band` or `rect`.",
      orientation: "Selects whether a `band` mask runs horizontally or vertically through the canvas.",
      cornerRadius: "Controls rounded corners when `shape` is `rect`."
    },
    commonUses: ["soft particle masks", "alpha fades", "beam falloff masks", "shader helper textures"],
    tuningNotes: [
      "Use `shape: \"circle\"` for radial particle fades and simple sprite alpha masks.",
      "Use `shape: \"band\"` with `orientation` to create directional falloff strips for beams and trails.",
      "Use `shape: \"rect\"` when you need a soft block mask for UI or shader helper textures.",
      "Increase `softness` when you want a broader, more forgiving feathered edge."
    ],
    compilesToLayerTypes: ["circle", "rect", "blur"],
    toRecipe: createSoftMaskRecipe
  },
  {
    name: "ring",
    description: "Circular ring with optional softness.",
    schema: ringParamsSchema,
    defaultParams: { thickness: 0.2, softness: 0.1 },
    primaryParams: ["thickness", "softness"],
    parameterSemantics: {
      thickness: "Controls the visible width of the ring band.",
      softness: "Controls how much blur is applied after the ring is drawn."
    },
    commonUses: ["shield hits", "portal outlines", "scan circles"],
    tuningNotes: [
      "Increase `thickness` for a heavier and more graphic ring body.",
      "Increase `softness` for a more diffuse and glowy edge."
    ],
    compilesToLayerTypes: ["ring", "blur"],
    toRecipe: createRingRecipe
  },
  {
    name: "smoke",
    description: "Diffuse smoky texture with blur and noise.",
    schema: smokeParamsSchema,
    defaultParams: { density: 0.6, turbulence: 0.4 },
    primaryParams: ["density", "turbulence"],
    parameterSemantics: {
      density: "Controls the strength of the noise pass and the size of the soft smoke body.",
      turbulence: "Controls the blur radius used to soften and spread the noisy result."
    },
    commonUses: ["fog puffs", "smoke wisps", "ambient haze"],
    tuningNotes: [
      "Increase `density` for a fuller and grainier smoke body.",
      "Increase `turbulence` for a softer, more diffused cloud."
    ],
    compilesToLayerTypes: ["noise", "blur", "circle"],
    toRecipe: createSmokeRecipe
  },
  {
    name: "shockwave",
    description: "Expanding impact ring with a soft inner glow and blurred edge.",
    schema: shockwaveParamsSchema,
    defaultParams: {
      radius: 0.3,
      thickness: 0.09,
      softness: 0.35,
      intensity: 0.85,
      innerGlow: 0.25
    },
    primaryParams: ["radius", "thickness", "softness", "intensity"],
    parameterSemantics: {
      radius: "Controls the normalized radius of the shockwave ring.",
      thickness: "Controls the visible width of the ring band before blur is applied.",
      softness: "Controls how much the final ring edge is softened by blur.",
      intensity: "Controls the brightness of the ring body and slightly increases bloom strength.",
      innerGlow: "Controls the strength of the soft radial glow inside the ring."
    },
    commonUses: ["shockwaves", "impact pulses", "expanding blast rings", "area markers"],
    tuningNotes: [
      "Increase `radius` when you want a wider expanding pulse silhouette.",
      "Increase `thickness` for a heavier and more graphic wave front.",
      "Increase `softness` when you want a bloomier, less crisp edge.",
      "Reduce `innerGlow` if you want the preset to read more like a pure ring than an energy pulse."
    ],
    compilesToLayerTypes: ["gradientCircle", "ring", "blur"],
    toRecipe: createShockwaveRecipe
  },
  {
    name: "panel",
    description: "Soft sci-fi panel block with a crisp gradient body and glow.",
    schema: panelParamsSchema,
    defaultParams: { width: 0.72, height: 0.32, cornerRadius: 0.05, glow: 0.35 },
    primaryParams: ["width", "height", "glow"],
    parameterSemantics: {
      width: "Controls the normalized width of the main panel body.",
      height: "Controls the normalized height of the main panel body.",
      cornerRadius: "Controls the roundness of the panel and its outer glow shell.",
      glow: "Controls the size and brightness of the outer soft glow block."
    },
    commonUses: ["sci-fi panels", "HUD cards", "UI blocks"],
    tuningNotes: [
      "Adjust `width` and `height` first to fit the intended layout aspect.",
      "Increase `glow` when you want the panel to feel more emissive.",
      "Use a moderate `cornerRadius` to keep the panel readable at small sizes."
    ],
    compilesToLayerTypes: ["rect", "blur", "gradientRect"],
    toRecipe: createPanelRecipe
  },
  {
    name: "beam",
    description: "Directional energy beam with a bright core and soft falloff.",
    schema: beamParamsSchema,
    defaultParams: { orientation: "horizontal", length: 0.85, thickness: 0.14, intensity: 0.85 },
    primaryParams: ["orientation", "length", "thickness", "intensity"],
    parameterSemantics: {
      orientation: "Selects whether the beam spans horizontally or vertically.",
      length: "Controls how much of the canvas the beam occupies along its main axis.",
      thickness: "Controls the thickness of the soft body and the crisp core.",
      intensity: "Controls center brightness and slightly increases blur strength."
    },
    commonUses: ["energy beams", "laser slashes", "scan lines"],
    tuningNotes: [
      "Use `orientation` to match the intended composition direction.",
      "Increase `intensity` for a hotter core and stronger bloom feel.",
      "Reduce `thickness` when you need a sharper slash-like beam."
    ],
    compilesToLayerTypes: ["gradientRect", "blur", "rect"],
    toRecipe: createBeamRecipe
  },
  {
    name: "colorRamp",
    description: "Gradient color band for heatmaps, shader ramps, and palette mapping.",
    schema: colorRampParamsSchema,
    defaultParams: {
      palette: "heat",
      orientation: "horizontal",
      thickness: 0.14,
      padding: 0.08,
      cornerRadius: 0.03
    },
    primaryParams: ["palette", "orientation", "thickness"],
    parameterSemantics: {
      palette: "Selects one of the built-in color sequences.",
      orientation: "Chooses whether the ramp runs horizontally or vertically.",
      thickness: "Controls the thickness of the ramp band.",
      padding: "Controls the empty margin around the ramp inside the canvas.",
      cornerRadius: "Rounds the ends or corners of the ramp band."
    },
    commonUses: ["heatmaps", "shader ramps", "palette strips"],
    tuningNotes: [
      "Change `palette` first when you need a different visual meaning.",
      "Use `padding` to keep the ramp away from texture edges.",
      "Increase `thickness` for a chunkier ramp that reads better in previews."
    ],
    compilesToLayerTypes: ["gradientRect"],
    toRecipe: createColorRampRecipe
  }
];

function toSerializableSchema(schema: z.ZodTypeAny): JsonSchemaObject {
  return z.toJSONSchema(schema) as JsonSchemaObject;
}

function getObjectSchemaPropertyNames(schema: JsonSchemaObject): string[] {
  const properties = schema.properties;

  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return [];
  }

  return Object.keys(properties as Record<string, unknown>);
}

function getObjectSchemaRequiredNames(schema: JsonSchemaObject): string[] {
  const required = schema.required;

  if (!Array.isArray(required)) {
    return [];
  }

  return required.filter((value): value is string => typeof value === "string");
}

export function listPresetCatalog(): PresetCatalogItem[] {
  return presetDefinitions.map(({ name, description, primaryParams, commonUses }) => ({
    name,
    description,
    primaryParams,
    commonUses
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

  const schema = toSerializableSchema(preset.schema);
  const paramNames = getObjectSchemaPropertyNames(schema);
  const defaultParamNames = Object.keys(preset.defaultParams);
  const schemaRequiredParamNames = getObjectSchemaRequiredNames(schema);
  const defaultParamNameSet = new Set(defaultParamNames);
  const requiredParamNames = schemaRequiredParamNames.filter((name) => !defaultParamNameSet.has(name));

  return {
    name: preset.name,
    description: preset.description,
    mode: "preset",
    paramCount: paramNames.length,
    paramNames,
    requiredParamNames,
    schemaRequiredParamNames,
    defaultParamNames,
    defaultParams: preset.defaultParams,
    parameterSemantics: preset.parameterSemantics,
    primaryParams: preset.primaryParams,
    commonUses: preset.commonUses,
    tuningNotes: preset.tuningNotes,
    compilesToLayerTypes: preset.compilesToLayerTypes,
    schema
  };
}

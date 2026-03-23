import * as z from "zod/v4";
import {
  blurLayerSchema,
  circleLayerSchema,
  gradientCircleLayerSchema,
  gradientRectLayerSchema,
  noiseLayerSchema,
  rectLayerSchema,
  ringLayerSchema
} from "./schema.js";
import type {
  JsonSchemaObject,
  LayerCatalogItem,
  LayerSchemaInfo,
  LayerSpec
} from "./types.js";

type LayerDefinition = Omit<LayerSchemaInfo, "schema"> & {
  schemaDefinition: z.ZodTypeAny;
};

function toSerializableSchema(schema: z.ZodTypeAny): JsonSchemaObject {
  return z.toJSONSchema(schema) as JsonSchemaObject;
}

const layerDefinitions: LayerDefinition[] = [
  {
    type: "gradientCircle",
    category: "draw",
    description: "A radial gradient clipped to a circular shape.",
    schemaDefinition: gradientCircleLayerSchema,
    parameterSemantics: {
      center: "Normalized center point of the circle in canvas space.",
      radius: "Normalized radius relative to the shorter canvas side.",
      colors: "Gradient colors distributed evenly from center to edge."
    },
    constraints: [
      {
        field: "colors",
        description: "At least two colors are required."
      }
    ],
    coordinateSpace: "Normalized canvas coordinates for `center`; radius is normalized to the shorter canvas side.",
    commonUses: ["soft glow cores", "orbs", "radial light blooms"],
    compositionNotes: [
      "Pairs well with `noise` to break up perfectly smooth ramps.",
      "Use before `blur` when you want the whole circular gradient softened further."
    ],
    examples: [
      {
        type: "gradientCircle",
        center: { x: 0.5, y: 0.5 },
        radius: 0.28,
        colors: ["rgba(255,255,255,1)", "rgba(255,180,80,0)"]
      }
    ]
  },
  {
    type: "circle",
    category: "draw",
    description: "A solid filled circle.",
    schemaDefinition: circleLayerSchema,
    parameterSemantics: {
      center: "Normalized center point of the circle in canvas space.",
      radius: "Normalized radius relative to the shorter canvas side.",
      color: "CSS color string for the fill."
    },
    constraints: [],
    coordinateSpace: "Normalized canvas coordinates for `center`; radius is normalized to the shorter canvas side.",
    commonUses: ["solid cores", "masks", "disc silhouettes"],
    compositionNotes: [
      "Use after `blur` if you want a crisp layer on top of already blurred content."
    ],
    examples: [
      {
        type: "circle",
        center: { x: 0.5, y: 0.5 },
        radius: 0.2,
        color: "rgba(255,255,255,1)"
      }
    ]
  },
  {
    type: "ring",
    category: "draw",
    description: "A hollow ring defined by inner and outer radii.",
    schemaDefinition: ringLayerSchema,
    parameterSemantics: {
      center: "Normalized center point of the ring in canvas space.",
      innerRadius: "Normalized inner radius relative to the shorter canvas side.",
      outerRadius: "Normalized outer radius relative to the shorter canvas side.",
      color: "CSS color string for the ring body."
    },
    constraints: [
      {
        field: "outerRadius",
        description: "Must be greater than `innerRadius`."
      }
    ],
    coordinateSpace: "Normalized canvas coordinates for `center`; radii are normalized to the shorter canvas side.",
    commonUses: ["shields", "scan rings", "portals", "impact outlines"],
    compositionNotes: [
      "Often followed by `blur` for soft-edged rings."
    ],
    examples: [
      {
        type: "ring",
        center: { x: 0.5, y: 0.5 },
        innerRadius: 0.18,
        outerRadius: 0.25,
        color: "rgba(160,220,255,0.85)"
      }
    ]
  },
  {
    type: "rect",
    category: "draw",
    description: "A solid rectangle with optional rounded corners.",
    schemaDefinition: rectLayerSchema,
    parameterSemantics: {
      origin: "Normalized top-left corner of the rectangle.",
      size: "Normalized width and height of the rectangle.",
      cornerRadius: "Optional normalized corner radius relative to the shorter side of the rectangle.",
      color: "CSS color string for the fill."
    },
    constraints: [],
    coordinateSpace: "Normalized canvas coordinates for `origin` and `size`.",
    commonUses: ["panels", "bars", "frames", "simple masks"],
    compositionNotes: [
      "Rounded corners are applied per rectangle, not as a separate shape type."
    ],
    examples: [
      {
        type: "rect",
        origin: { x: 0.18, y: 0.32 },
        size: { width: 0.64, height: 0.24 },
        cornerRadius: 0.04,
        color: "rgba(24,64,120,0.9)"
      }
    ]
  },
  {
    type: "gradientRect",
    category: "draw",
    description: "A rectangle filled with a simple horizontal or vertical linear gradient.",
    schemaDefinition: gradientRectLayerSchema,
    parameterSemantics: {
      origin: "Normalized top-left corner of the rectangle.",
      size: "Normalized width and height of the rectangle.",
      cornerRadius: "Optional normalized corner radius relative to the shorter side of the rectangle.",
      direction: "Gradient direction, limited to horizontal or vertical.",
      colors: "Gradient colors distributed evenly along the chosen direction."
    },
    constraints: [
      {
        field: "direction",
        description: "Only `horizontal` and `vertical` are supported."
      },
      {
        field: "colors",
        description: "At least two colors are required."
      }
    ],
    coordinateSpace: "Normalized canvas coordinates for `origin` and `size`.",
    commonUses: ["beams", "panels", "UI bars", "color ramps"],
    compositionNotes: [
      "Use `horizontal` for left-to-right ramps and `vertical` for top-to-bottom ramps."
    ],
    examples: [
      {
        type: "gradientRect",
        origin: { x: 0.1, y: 0.42 },
        size: { width: 0.8, height: 0.16 },
        cornerRadius: 0.03,
        direction: "horizontal",
        colors: ["#0018ff", "#00e4ff", "#fff200", "#ff3a00"]
      }
    ]
  },
  {
    type: "noise",
    category: "effect",
    description: "A fullscreen noise pass applied to the current canvas result.",
    schemaDefinition: noiseLayerSchema,
    parameterSemantics: {
      amount: "Normalized intensity of the noise perturbation."
    },
    constraints: [],
    coordinateSpace: "Fullscreen effect; no local coordinates.",
    commonUses: ["grain", "breakup", "smoke texture variation"],
    compositionNotes: [
      "Affects the current whole-canvas result, not a future isolated pass.",
      "Usually placed before `blur` when you want a softened noisy texture."
    ],
    examples: [
      {
        type: "noise",
        amount: 0.18
      }
    ]
  },
  {
    type: "blur",
    category: "effect",
    description: "A fullscreen blur pass applied to the current canvas result.",
    schemaDefinition: blurLayerSchema,
    parameterSemantics: {
      radius: "Normalized blur radius relative to the shorter canvas side."
    },
    constraints: [],
    coordinateSpace: "Fullscreen effect; no local coordinates.",
    commonUses: ["soft falloff", "glow bloom", "smoothing noise"],
    compositionNotes: [
      "Affects the current whole-canvas result, not future layers.",
      "Place it after the layers you want blurred."
    ],
    examples: [
      {
        type: "blur",
        radius: 0.06
      }
    ]
  }
];

export function listLayerCatalog(): LayerCatalogItem[] {
  return layerDefinitions.map(({ type, category, description }) => ({
    type,
    category,
    description
  }));
}

export function getLayerSchemaInfo(type: LayerSpec["type"]): LayerSchemaInfo | undefined {
  const definition = layerDefinitions.find((item) => item.type === type);

  if (!definition) {
    return undefined;
  }

  return {
    type: definition.type,
    category: definition.category,
    description: definition.description,
    schema: toSerializableSchema(definition.schemaDefinition),
    parameterSemantics: definition.parameterSemantics,
    constraints: definition.constraints,
    coordinateSpace: definition.coordinateSpace,
    commonUses: definition.commonUses,
    compositionNotes: definition.compositionNotes,
    examples: definition.examples
  };
}

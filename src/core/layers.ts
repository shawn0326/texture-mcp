import * as z from "zod/v4";
import {
  blurLayerSchema,
  circleLayerSchema,
  gradientCircleLayerSchema,
  gradientRectLayerSchema,
  noiseLayerSchema,
  rectLayerSchema,
  ringLayerSchema,
  textLayerSchema
} from "./schema.js";
import type {
  JsonSchemaObject,
  LayerCatalogItem,
  LayerSchemaInfo,
  LayerSpec
} from "./types.js";

type LayerDefinition = Omit<
  LayerSchemaInfo,
  "schema" | "mode" | "parameterNames" | "requiredParameterNames" | "constraintFields" | "exampleCount"
> & {
  schemaDefinition: z.ZodTypeAny;
};

function toSerializableSchema(schema: z.ZodTypeAny): JsonSchemaObject {
  return z.toJSONSchema(schema) as JsonSchemaObject;
}

function getObjectSchemaRequiredNames(schema: JsonSchemaObject): string[] {
  const required = schema.required;

  if (!Array.isArray(required)) {
    return [];
  }

  return required.filter((value): value is string => typeof value === "string");
}

const layerDefinitions: LayerDefinition[] = [
  {
    type: "gradientCircle",
    category: "draw",
    description: "A radial gradient clipped to a circular shape.",
    schemaDefinition: gradientCircleLayerSchema,
    primaryParameters: ["center", "radius", "colors"],
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
    applicationScope: "local",
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
    primaryParameters: ["center", "radius", "color"],
    parameterSemantics: {
      center: "Normalized center point of the circle in canvas space.",
      radius: "Normalized radius relative to the shorter canvas side.",
      color: "CSS color string for the fill."
    },
    constraints: [],
    applicationScope: "local",
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
    primaryParameters: ["center", "innerRadius", "outerRadius", "color"],
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
    applicationScope: "local",
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
    primaryParameters: ["origin", "size", "color"],
    parameterSemantics: {
      origin: "Normalized top-left corner of the rectangle.",
      size: "Normalized width and height of the rectangle.",
      cornerRadius: "Optional normalized corner radius relative to the shorter side of the rectangle.",
      color: "CSS color string for the fill."
    },
    constraints: [],
    applicationScope: "local",
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
    primaryParameters: ["origin", "size", "direction", "colors"],
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
    applicationScope: "local",
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
    type: "text",
    category: "draw",
    description: "A single-line text label drawn inside a normalized layout box.",
    schemaDefinition: textLayerSchema,
    primaryParameters: ["text", "origin", "size", "color"],
    parameterSemantics: {
      text: "Single-line text content to render.",
      origin: "Normalized top-left corner of the text layout box.",
      size: "Normalized width and height of the text layout box.",
      color: "CSS color string used for the text fill.",
      fontFamily: "Canvas/CSS font family string. Rendering may vary across hosts based on available fonts.",
      fontSize: "Optional normalized font size relative to canvas height. Defaults to roughly 80% of the box height.",
      fontWeight: "Optional font weight, limited to normal or bold.",
      fontStyle: "Optional font style, limited to normal or italic.",
      align: "Horizontal alignment within the layout box.",
      verticalAlign: "Vertical alignment within the layout box.",
      clip: "Whether to clip text drawing to the layout box."
    },
    constraints: [
      {
        field: "text",
        description: "Must be a non-empty string up to 256 characters."
      }
    ],
    applicationScope: "local",
    coordinateSpace: "Normalized canvas coordinates for `origin` and `size`; `fontSize` is normalized to canvas height.",
    commonUses: ["panel labels", "HUD text", "damage numbers", "simple UI titles"],
    compositionNotes: [
      "Use multiple `text` layers with different colors and offsets if you want faux outlines or shadows.",
      "Place `blur` after text layers if you want the whole text result softened or bloomed."
    ],
    examples: [
      {
        type: "text",
        text: "ALERT",
        origin: { x: 0.16, y: 0.32 },
        size: { width: 0.68, height: 0.2 },
        color: "rgba(255,255,255,1)",
        fontFamily: "sans-serif",
        fontWeight: "bold",
        align: "center",
        verticalAlign: "middle",
        clip: true
      }
    ]
  },
  {
    type: "noise",
    category: "effect",
    description: "A fullscreen noise pass applied to the current canvas result.",
    schemaDefinition: noiseLayerSchema,
    primaryParameters: ["amount"],
    parameterSemantics: {
      amount: "Normalized intensity of the noise perturbation."
    },
    constraints: [],
    applicationScope: "fullscreen",
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
    primaryParameters: ["radius"],
    parameterSemantics: {
      radius: "Normalized blur radius relative to the shorter canvas side."
    },
    constraints: [],
    applicationScope: "fullscreen",
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
  return layerDefinitions.map(
    ({ type, category, description, primaryParameters, commonUses, applicationScope }) => ({
      type,
      category,
      description,
      primaryParameters,
      commonUses,
      applicationScope
    })
  );
}

export function getLayerSchemaInfo(type: LayerSpec["type"]): LayerSchemaInfo | undefined {
  const definition = layerDefinitions.find((item) => item.type === type);

  if (!definition) {
    return undefined;
  }

  const schema = toSerializableSchema(definition.schemaDefinition);
  const parameterNames = Object.keys(definition.parameterSemantics);
  const requiredParameterNames = getObjectSchemaRequiredNames(schema).filter((name) => name !== "type");
  const constraintFields = definition.constraints.map((constraint) => constraint.field);

  return {
    type: definition.type,
    category: definition.category,
    description: definition.description,
    mode: "recipe",
    primaryParameters: definition.primaryParameters,
    parameterNames,
    requiredParameterNames,
    constraintFields,
    exampleCount: definition.examples.length,
    schema,
    parameterSemantics: definition.parameterSemantics,
    constraints: definition.constraints,
    applicationScope: definition.applicationScope,
    coordinateSpace: definition.coordinateSpace,
    commonUses: definition.commonUses,
    compositionNotes: definition.compositionNotes,
    examples: definition.examples
  };
}

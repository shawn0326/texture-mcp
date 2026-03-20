import { Canvas, type SKRSContext2D, createCanvas } from "@napi-rs/canvas";
import { renderOptionsSchema, recipeSchema } from "./schema.js";
import type {
  BlurLayer,
  CircleLayer,
  GroupLayer,
  ImageFormat,
  LayerSpec,
  NoiseLayer,
  RadialGradientLayer,
  Recipe,
  RenderOptions,
  RingLayer
} from "./types.js";

const TAU = Math.PI * 2;

export type RenderOutputOptions = {
  format?: ImageFormat;
  quality?: number;
};

type RandomSource = () => number;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toCanvasPoint(value: number, size: number): number {
  return value * size;
}

function toCanvasRadius(value: number, width: number, height: number): number {
  return value * Math.min(width, height);
}

function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let output = Math.imul(state ^ (state >>> 15), 1 | state);
    output ^= output + Math.imul(output ^ (output >>> 7), 61 | output);
    return ((output ^ (output >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function applyRadialGradient(
  context: SKRSContext2D,
  layer: RadialGradientLayer,
  width: number,
  height: number
): void {
  const centerX = toCanvasPoint(layer.center.x, width);
  const centerY = toCanvasPoint(layer.center.y, height);
  const radius = toCanvasRadius(layer.radius, width, height);
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

  layer.colors.forEach((color, index) => {
    const stop = layer.colors.length === 1 ? 1 : index / (layer.colors.length - 1);
    gradient.addColorStop(stop, color);
  });

  context.save();
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function applyCircle(
  context: SKRSContext2D,
  layer: CircleLayer,
  width: number,
  height: number
): void {
  const centerX = toCanvasPoint(layer.center.x, width);
  const centerY = toCanvasPoint(layer.center.y, height);
  const radius = toCanvasRadius(layer.radius, width, height);

  context.save();
  context.beginPath();
  context.fillStyle = layer.color;
  context.arc(centerX, centerY, radius, 0, TAU);
  context.fill();
  context.restore();
}

function applyRing(
  context: SKRSContext2D,
  layer: RingLayer,
  width: number,
  height: number
): void {
  const centerX = toCanvasPoint(layer.center.x, width);
  const centerY = toCanvasPoint(layer.center.y, height);
  const innerRadius = toCanvasRadius(layer.innerRadius, width, height);
  const outerRadius = toCanvasRadius(layer.outerRadius, width, height);

  context.save();
  context.beginPath();
  context.fillStyle = layer.color;
  context.moveTo(centerX + outerRadius, centerY);
  context.arc(centerX, centerY, outerRadius, 0, TAU);
  context.moveTo(centerX + innerRadius, centerY);
  context.arc(centerX, centerY, innerRadius, 0, TAU);
  context.fill("evenodd");
  context.restore();
}

function applyNoise(
  context: SKRSContext2D,
  layer: NoiseLayer,
  width: number,
  height: number,
  random: RandomSource
): void {
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const noiseStrength = layer.amount * 64;
  const alphaFloor = Math.round(layer.amount * 96);

  for (let index = 0; index < data.length; index += 4) {
    const delta = (random() - 0.5) * 2 * noiseStrength;
    data[index] = clampByte(data[index] + delta);
    data[index + 1] = clampByte(data[index + 1] + delta);
    data[index + 2] = clampByte(data[index + 2] + delta);
    data[index + 3] = Math.max(data[index + 3], alphaFloor);
  }

  context.putImageData(imageData, 0, 0);
}

function applyBlur(
  context: SKRSContext2D,
  layer: BlurLayer,
  width: number,
  height: number
): void {
  const blurRadius = toCanvasRadius(layer.radius, width, height);

  if (blurRadius <= 0) {
    return;
  }

  const snapshotCanvas = createCanvas(width, height);
  const snapshotContext = snapshotCanvas.getContext("2d");
  snapshotContext.drawImage(context.canvas, 0, 0);

  context.save();
  context.clearRect(0, 0, width, height);
  context.filter = `blur(${blurRadius.toFixed(2)}px)`;
  context.drawImage(snapshotCanvas, 0, 0);
  context.restore();
}

function applyGroup(
  context: SKRSContext2D,
  layer: GroupLayer,
  width: number,
  height: number,
  random: RandomSource
): void {
  for (const child of layer.children) {
    applyLayer(context, child, width, height, random);
  }
}

function applyLayer(
  context: SKRSContext2D,
  layer: LayerSpec,
  width: number,
  height: number,
  random: RandomSource
): void {
  switch (layer.type) {
    case "radialGradient":
      applyRadialGradient(context, layer, width, height);
      return;
    case "circle":
      applyCircle(context, layer, width, height);
      return;
    case "ring":
      applyRing(context, layer, width, height);
      return;
    case "noise":
      applyNoise(context, layer, width, height, random);
      return;
    case "blur":
      applyBlur(context, layer, width, height);
      return;
    case "group":
      applyGroup(context, layer, width, height, random);
      return;
    default: {
      const exhaustiveLayer: never = layer;
      throw new Error(`Unsupported layer type: ${JSON.stringify(exhaustiveLayer)}`);
    }
  }
}

function encodeCanvas(canvas: Canvas, options?: RenderOutputOptions): Buffer {
  const format = options?.format ?? "png";

  if (format === "png") {
    return canvas.toBuffer("image/png");
  }

  if (format === "jpeg") {
    return canvas.toBuffer("image/jpeg", options?.quality);
  }

  return canvas.toBuffer("image/webp", options?.quality);
}

export function renderRecipeToCanvas(
  recipe: Recipe,
  renderOptions: RenderOptions
): Canvas {
  const normalizedRecipe = recipeSchema.parse(recipe) as Recipe;
  const normalizedRenderOptions = renderOptionsSchema.parse(renderOptions) as RenderOptions;
  const seed = normalizedRenderOptions.seed ?? 0;
  const random = createSeededRandom(seed);
  const canvas = createCanvas(normalizedRenderOptions.width, normalizedRenderOptions.height);
  const context = canvas.getContext("2d", {
    alpha: true
  });

  context.clearRect(0, 0, normalizedRenderOptions.width, normalizedRenderOptions.height);

  for (const layer of normalizedRecipe.layers) {
    applyLayer(
      context,
      layer,
      normalizedRenderOptions.width,
      normalizedRenderOptions.height,
      random
    );
  }

  return canvas;
}

export function renderRecipe(
  recipe: Recipe,
  renderOptions: RenderOptions,
  outputOptions?: RenderOutputOptions
): Buffer {
  const canvas = renderRecipeToCanvas(recipe, renderOptions);

  return encodeCanvas(canvas, outputOptions);
}

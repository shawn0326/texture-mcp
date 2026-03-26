import { Canvas, type SKRSContext2D, createCanvas } from "@napi-rs/canvas";
import { DEFAULT_TEXTURE_SEED } from "./limits.js";
import { normalizeRecipe } from "./recipe.js";
import { renderOptionsSchema } from "./schema.js";
import type {
  BlurLayer,
  CircleLayer,
  GradientCircleLayer,
  GradientRectLayer,
  ImageFormat,
  LayerSpec,
  NoiseLayer,
  RectLayer,
  Recipe,
  RenderOptions,
  RingLayer,
  TextLayer
} from "./types.js";

const TAU = Math.PI * 2;

export type RenderOutputOptions = {
  format?: ImageFormat;
  quality?: number;
};

type RandomSource = () => number;
type RectGeometry = {
  x: number;
  y: number;
  rectWidth: number;
  rectHeight: number;
  radius: number;
  centerX: number;
  centerY: number;
};

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toCanvasPoint(value: number, size: number): number {
  return value * size;
}

function toCanvasRadius(value: number, width: number, height: number): number {
  return value * Math.min(width, height);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
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

function getRectGeometry(
  layer: RectLayer | GradientRectLayer,
  width: number,
  height: number
): RectGeometry {
  const x = toCanvasPoint(layer.origin.x, width);
  const y = toCanvasPoint(layer.origin.y, height);
  const rectWidth = toCanvasPoint(layer.size.width, width);
  const rectHeight = toCanvasPoint(layer.size.height, height);
  const radius = Math.min(
    toCanvasRadius(layer.cornerRadius ?? 0, rectWidth, rectHeight),
    rectWidth / 2,
    rectHeight / 2
  );

  return {
    x,
    y,
    rectWidth,
    rectHeight,
    radius,
    centerX: x + rectWidth / 2,
    centerY: y + rectHeight / 2
  };
}

function createRectPath(
  context: SKRSContext2D,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  radius: number
): void {
  context.beginPath();
  if (radius <= 0) {
    context.rect(x, y, rectWidth, rectHeight);
    return;
  }

  context.moveTo(x + radius, y);
  context.lineTo(x + rectWidth - radius, y);
  context.arcTo(x + rectWidth, y, x + rectWidth, y + radius, radius);
  context.lineTo(x + rectWidth, y + rectHeight - radius);
  context.arcTo(x + rectWidth, y + rectHeight, x + rectWidth - radius, y + rectHeight, radius);
  context.lineTo(x + radius, y + rectHeight);
  context.arcTo(x, y + rectHeight, x, y + rectHeight - radius, radius);
  context.lineTo(x, y + radius);
  context.arcTo(x, y, x + radius, y, radius);
  context.closePath();
}

function applyGradientCircle(
  context: SKRSContext2D,
  layer: GradientCircleLayer,
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
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, TAU);
  context.clip();
  context.fillStyle = gradient;
  context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
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

function applyRect(
  context: SKRSContext2D,
  layer: RectLayer,
  width: number,
  height: number
): void {
  const geometry = getRectGeometry(layer, width, height);
  const rotation = toRadians(layer.rotation ?? 0);

  context.save();
  context.translate(geometry.centerX, geometry.centerY);
  context.rotate(rotation);
  createRectPath(
    context,
    -geometry.rectWidth / 2,
    -geometry.rectHeight / 2,
    geometry.rectWidth,
    geometry.rectHeight,
    geometry.radius
  );
  context.fillStyle = layer.color;
  context.fill();
  context.restore();
}

function applyGradientRect(
  context: SKRSContext2D,
  layer: GradientRectLayer,
  width: number,
  height: number
): void {
  const geometry = getRectGeometry(layer, width, height);
  const rotation = toRadians(layer.rotation ?? 0);

  context.save();
  context.translate(geometry.centerX, geometry.centerY);
  context.rotate(rotation);
  createRectPath(
    context,
    -geometry.rectWidth / 2,
    -geometry.rectHeight / 2,
    geometry.rectWidth,
    geometry.rectHeight,
    geometry.radius
  );
  const gradient =
    layer.direction === "horizontal"
      ? context.createLinearGradient(
          -geometry.rectWidth / 2,
          -geometry.rectHeight / 2,
          geometry.rectWidth / 2,
          -geometry.rectHeight / 2
        )
      : context.createLinearGradient(
          -geometry.rectWidth / 2,
          -geometry.rectHeight / 2,
          -geometry.rectWidth / 2,
          geometry.rectHeight / 2
        );

  layer.colors.forEach((color, index) => {
    const stop = layer.colors.length === 1 ? 1 : index / (layer.colors.length - 1);
    gradient.addColorStop(stop, color);
  });

  context.fillStyle = gradient;
  context.fill();
  context.restore();
}

function applyText(
  context: SKRSContext2D,
  layer: TextLayer,
  width: number,
  height: number
): void {
  const boxX = toCanvasPoint(layer.origin.x, width);
  const boxY = toCanvasPoint(layer.origin.y, height);
  const boxWidth = toCanvasPoint(layer.size.width, width);
  const boxHeight = toCanvasPoint(layer.size.height, height);
  const centerX = boxX + boxWidth / 2;
  const centerY = boxY + boxHeight / 2;
  const localBoxX = -boxWidth / 2;
  const localBoxY = -boxHeight / 2;
  const fontSize = Math.max(1, toCanvasPoint(layer.fontSize ?? layer.size.height * 0.8, height));
  const align = layer.align ?? "center";
  const verticalAlign = layer.verticalAlign ?? "middle";
  const fontStyle = layer.fontStyle ?? "normal";
  const fontWeight = layer.fontWeight ?? "normal";
  const fontFamily = layer.fontFamily ?? "sans-serif";
  const rotation = toRadians(layer.rotation ?? 0);

  context.save();
  context.translate(centerX, centerY);
  context.rotate(rotation);

  if (layer.clip) {
    context.beginPath();
    context.rect(localBoxX, localBoxY, boxWidth, boxHeight);
    context.clip();
  }

  context.fillStyle = layer.color;
  context.textAlign = align;
  context.textBaseline = "alphabetic";
  context.font = `${fontStyle} ${fontWeight} ${fontSize.toFixed(2)}px ${fontFamily}`;

  const metrics = context.measureText(layer.text);
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;

  const textX =
    align === "left"
      ? localBoxX
      : align === "right"
        ? localBoxX + boxWidth
        : 0;
  const baselineY =
    verticalAlign === "top"
      ? localBoxY + ascent
      : verticalAlign === "bottom"
        ? localBoxY + boxHeight - descent
        : (ascent - descent) / 2;

  context.fillText(layer.text, textX, baselineY);
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

function applyLayer(
  context: SKRSContext2D,
  layer: LayerSpec,
  width: number,
  height: number,
  random: RandomSource
): void {
  switch (layer.type) {
    case "gradientCircle":
      applyGradientCircle(context, layer, width, height);
      return;
    case "circle":
      applyCircle(context, layer, width, height);
      return;
    case "ring":
      applyRing(context, layer, width, height);
      return;
    case "rect":
      applyRect(context, layer, width, height);
      return;
    case "gradientRect":
      applyGradientRect(context, layer, width, height);
      return;
    case "text":
      applyText(context, layer, width, height);
      return;
    case "noise":
      applyNoise(context, layer, width, height, random);
      return;
    case "blur":
      applyBlur(context, layer, width, height);
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
  const normalizedRecipe = normalizeRecipe(recipe);
  const normalizedRenderOptions = renderOptionsSchema.parse(renderOptions) as RenderOptions;
  const seed = normalizedRenderOptions.seed ?? DEFAULT_TEXTURE_SEED;
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

const supportedColorFormatsText =
  "Supported formats: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(r, g, b)`, `rgba(r, g, b, a)`, or `transparent`.";

const hexColorPattern = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const rgbColorPattern = /^rgb\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*\)$/i;
const rgbaColorPattern =
  /^rgba\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*\)$/i;

type ParsedColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function isByteChannel(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}

function isUnitAlpha(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function formatAlpha(alpha: number): string {
  const rounded = Math.round(alpha * 1_000_000) / 1_000_000;

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toString();
}

function expandHexChannel(value: string): string {
  return value.length === 1 ? `${value}${value}` : value;
}

function parseHexColor(value: string): ParsedColor | undefined {
  const match = hexColorPattern.exec(value);

  if (!match) {
    return undefined;
  }

  const [, rawDigits] = match;
  const digits =
    rawDigits.length <= 4
      ? rawDigits
          .split("")
          .map((digit) => expandHexChannel(digit))
          .join("")
      : rawDigits;
  const r = Number.parseInt(digits.slice(0, 2), 16);
  const g = Number.parseInt(digits.slice(2, 4), 16);
  const b = Number.parseInt(digits.slice(4, 6), 16);
  const a = digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}

function parseRgbColor(value: string): ParsedColor | undefined {
  const rgbMatch = rgbColorPattern.exec(value);

  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1], 10);
    const g = Number.parseInt(rgbMatch[2], 10);
    const b = Number.parseInt(rgbMatch[3], 10);

    if (!isByteChannel(r) || !isByteChannel(g) || !isByteChannel(b)) {
      return undefined;
    }

    return { r, g, b, a: 1 };
  }

  const rgbaMatch = rgbaColorPattern.exec(value);

  if (!rgbaMatch) {
    return undefined;
  }

  const r = Number.parseInt(rgbaMatch[1], 10);
  const g = Number.parseInt(rgbaMatch[2], 10);
  const b = Number.parseInt(rgbaMatch[3], 10);
  const a = Number.parseFloat(rgbaMatch[4]);

  if (!isByteChannel(r) || !isByteChannel(g) || !isByteChannel(b) || !isUnitAlpha(a)) {
    return undefined;
  }

  return { r, g, b, a };
}

function parseSupportedColor(value: string): ParsedColor | undefined {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (/^transparent$/i.test(trimmed)) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  return parseHexColor(trimmed) ?? parseRgbColor(trimmed);
}

export function getSupportedColorFormatsText(): string {
  return supportedColorFormatsText;
}

export function getColorValidationMessage(value: string): string | undefined {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return `Color values must not be empty. ${supportedColorFormatsText}`;
  }

  if (trimmed.startsWith("#") && !hexColorPattern.test(trimmed)) {
    return `Hex colors must use 3, 4, 6, or 8 hexadecimal digits after '#'. ${supportedColorFormatsText}`;
  }

  const rgbLikeInput = /^[a-z]+\(/i.test(trimmed);
  const parsedColor = parseSupportedColor(trimmed);

  if (parsedColor) {
    return undefined;
  }

  if (/^rgba?\(/i.test(trimmed)) {
    return `RGB channels must be integers from 0 to 255, and alpha must be between 0 and 1. ${supportedColorFormatsText}`;
  }

  if (rgbLikeInput) {
    return `Unsupported color function. ${supportedColorFormatsText}`;
  }

  return `Unsupported color format. ${supportedColorFormatsText}`;
}

export function normalizeColorString(value: string): string {
  const parsedColor = parseSupportedColor(value);

  if (!parsedColor) {
    throw new Error(getColorValidationMessage(value) ?? `Unsupported color format. ${supportedColorFormatsText}`);
  }

  return `rgba(${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}, ${formatAlpha(parsedColor.a)})`;
}

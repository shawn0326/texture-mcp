export function parseRecipeLikeInput(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(value);
  } catch {
    throw new Error("Recipe JSON string could not be parsed. Pass the recipe object directly, or provide valid JSON.");
  }

  if (!parsedValue || Array.isArray(parsedValue) || typeof parsedValue !== "object") {
    throw new Error(
      "Recipe must be an object. Pass the recipe object directly, not a JSON string that decodes to a non-object value."
    );
  }

  return parsedValue;
}

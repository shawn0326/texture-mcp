import { ZodError } from "zod/v4";
import { getRecipeStats, normalizeRecipe } from "./recipe.js";
import type { ValidateRecipeOutput, ValidationIssue } from "./types.js";

function formatIssuePath(path: Array<string | number>): string {
  if (path.length === 0) {
    return "$";
  }

  let formattedPath = "$";

  for (const segment of path) {
    if (typeof segment === "number") {
      formattedPath = `${formattedPath}[${segment}]`;
      continue;
    }

    formattedPath = `${formattedPath}.${segment}`;
  }

  return formattedPath;
}

function toValidationIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: formatIssuePath(issue.path as Array<string | number>),
    message: issue.message
  }));
}

export function validateRecipe(input: unknown): ValidateRecipeOutput {
  try {
    const normalizedRecipe = normalizeRecipe(input as never);

    return {
      valid: true,
      errorCount: 0,
      readyForGeneration: true,
      errors: [],
      normalizedRecipe,
      stats: getRecipeStats(normalizedRecipe)
    };
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        errorCount: error.issues.length,
        readyForGeneration: false,
        errors: toValidationIssues(error)
      };
    }

    return {
      valid: false,
      errorCount: 1,
      readyForGeneration: false,
      errors: [
        {
          path: "$",
          message: error instanceof Error ? error.message : "Unknown validation error"
        }
      ]
    };
  }
}

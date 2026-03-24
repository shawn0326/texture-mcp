import { existsSync, lstatSync, realpathSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { exportTextureInputSchema, metaSchema } from "./schema.js";
import { renderRecipe } from "./renderer.js";
import type {
  ExportTextureInput,
  ExportTextureOutput,
  ImageFormat,
  Meta,
  Recipe
} from "./types.js";

export type ExportTextureSource = {
  recipe: Recipe;
  imageBuffer: Buffer;
  meta: Meta;
};

export type ResolvedExportPaths = {
  savedPath: string;
  metaPath?: string;
};

function isPathInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function resolveExistingRealPath(targetPath: string, label: string): string {
  try {
    return realpathSync(targetPath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to resolve ${label}: ${message}`);
  }
}

function findClosestExistingPath(targetPath: string): string {
  let currentPath = targetPath;

  while (!existsSync(currentPath)) {
    const parentPath = path.dirname(currentPath);

    if (parentPath === currentPath) {
      throw new Error("Unable to find an existing parent directory for the export path.");
    }

    currentPath = parentPath;
  }

  return currentPath;
}

function ensureExistingPathIsNotSymlink(targetPath: string, label: string): void {
  if (!existsSync(targetPath)) {
    return;
  }

  const stats = lstatSync(targetPath);

  if (stats.isSymbolicLink()) {
    throw new Error(`${label} must not be an existing symbolic link.`);
  }
}

function ensureRealPathInsideWorkspace(
  targetPath: string,
  workspaceRootRealPath: string,
  label: string
): void {
  const closestExistingPath = findClosestExistingPath(targetPath);
  const closestExistingRealPath = resolveExistingRealPath(closestExistingPath, label);

  if (!isPathInside(workspaceRootRealPath, closestExistingRealPath)) {
    throw new Error(`${label} resolves outside the workspace root.`);
  }
}

function resolveRenderedBuffer(
  source: ExportTextureSource,
  format: ImageFormat,
  quality?: number
): Buffer {
  if (format === "png" && source.imageBuffer.length > 0) {
    return source.imageBuffer;
  }

  return renderRecipe(
    source.meta.recipe,
    {
      width: source.meta.width,
      height: source.meta.height,
      seed: source.meta.seed
    },
    {
      format,
      quality
    }
  );
}

function createMetaForExport(source: ExportTextureSource, format: ImageFormat): Meta {
  return metaSchema.parse({
    ...source.meta,
    format
  }) as Meta;
}

export function resolveExportPaths(
  workspaceRoot: string,
  outputPath: string,
  saveMeta?: boolean
): ResolvedExportPaths {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const workspaceRootRealPath = resolveExistingRealPath(resolvedWorkspaceRoot, "`workspaceRoot`");

  if (path.isAbsolute(outputPath)) {
    throw new Error("`outputPath` must be relative to the workspace root.");
  }

  const savedPath = path.resolve(resolvedWorkspaceRoot, outputPath);

  if (!isPathInside(resolvedWorkspaceRoot, savedPath)) {
    throw new Error("`outputPath` must stay inside the workspace root.");
  }

  const metaPath = saveMeta ? `${savedPath}.meta.json` : undefined;

  ensureRealPathInsideWorkspace(path.dirname(savedPath), workspaceRootRealPath, "The export directory");
  ensureExistingPathIsNotSymlink(savedPath, "The export file path");

  if (metaPath) {
    ensureRealPathInsideWorkspace(path.dirname(metaPath), workspaceRootRealPath, "The meta directory");
    ensureExistingPathIsNotSymlink(metaPath, "The meta file path");
  }

  return {
    savedPath,
    metaPath
  };
}

export async function exportTexture(
  source: ExportTextureSource,
  workspaceRoot: string,
  input: ExportTextureInput
): Promise<ExportTextureOutput> {
  const parsedInput = exportTextureInputSchema.parse(input) as ExportTextureInput;
  const { savedPath, metaPath } = resolveExportPaths(
    workspaceRoot,
    parsedInput.outputPath,
    parsedInput.saveMeta
  );
  const imageBuffer = resolveRenderedBuffer(source, parsedInput.format, parsedInput.quality);

  await mkdir(path.dirname(savedPath), { recursive: true });
  await writeFile(savedPath, imageBuffer);

  if (metaPath) {
    const meta = createMetaForExport(source, parsedInput.format);
    await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  }

  return {
    savedPath,
    metaPath,
    width: source.meta.width,
    height: source.meta.height,
    format: parsedInput.format,
    sourceMode: source.meta.preset ? "preset" : "recipe",
    preset: source.meta.preset,
    seed: source.meta.seed,
    metaSaved: Boolean(metaPath),
    message: `Texture exported to ${savedPath}.`
  };
}

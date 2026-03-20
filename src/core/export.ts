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
  if (path.isAbsolute(outputPath)) {
    throw new Error("`outputPath` must be relative to the workspace root.");
  }

  const savedPath = path.resolve(workspaceRoot, outputPath);

  if (!isPathInside(workspaceRoot, savedPath)) {
    throw new Error("`outputPath` must stay inside the workspace root.");
  }

  return {
    savedPath,
    metaPath: saveMeta ? `${savedPath}.meta.json` : undefined
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
    message: `Texture exported to ${savedPath}.`
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const { generateTexture } = await import(
  pathToFileURL(path.join(projectRoot, "dist", "core", "generate.js")).href
);
const {
  createEmptyRecipe,
  createRecipe,
  getRecipeStats,
  normalizeRecipe
} = await import(pathToFileURL(path.join(projectRoot, "dist", "core", "recipe.js")).href);
const { renderRecipe, renderRecipeToCanvas } = await import(
  pathToFileURL(path.join(projectRoot, "dist", "core", "renderer.js")).href
);
const {
  DEFAULT_TEXTURE_SEED,
  MAX_RECIPE_LAYERS,
  MAX_TEXTURE_DIMENSION
} = await import(pathToFileURL(path.join(projectRoot, "dist", "core", "limits.js")).href);
const {
  exportTexture,
  resolveExportPaths
} = await import(pathToFileURL(path.join(projectRoot, "dist", "core", "export.js")).href);
const {
  getPresetSchemaInfo,
  listPresetCatalog
} = await import(pathToFileURL(path.join(projectRoot, "dist", "core", "presets.js")).href);
const {
  getLayerSchemaInfo,
  listLayerCatalog
} = await import(pathToFileURL(path.join(projectRoot, "dist", "core", "layers.js")).href);
const { validateRecipe } = await import(
  pathToFileURL(path.join(projectRoot, "dist", "core", "validate.js")).href
);

test("core: listPresetCatalog returns the MVP preset catalog", () => {
  const presets = listPresetCatalog();

  assert.deepEqual(
    presets.map((preset) => preset.name).sort(),
    ["beam", "colorRamp", "glow", "panel", "ring", "smoke"]
  );
});

test("core: getPresetSchemaInfo returns serializable schema info", () => {
  const preset = getPresetSchemaInfo("colorRamp");

  assert.ok(preset);
  assert.equal(preset.name, "colorRamp");
  assert.equal(preset.defaultParams.palette, "heat");
  assert.equal(preset.schema.type, "object");
});

test("core: listLayerCatalog returns the supported layer types", () => {
  const layers = listLayerCatalog();

  assert.deepEqual(
    layers.map((layer) => layer.type).sort(),
    ["blur", "circle", "gradientCircle", "gradientRect", "noise", "rect", "ring"]
  );
});

test("core: getLayerSchemaInfo returns semantic schema info", () => {
  const layer = getLayerSchemaInfo("gradientRect");

  assert.ok(layer);
  assert.equal(layer.type, "gradientRect");
  assert.equal(layer.category, "draw");
  assert.equal(layer.schema.type, "object");
  assert.equal(layer.examples.length > 0, true);
});

test("core: recipe helpers validate and normalize recipe structures", () => {
  const recipe = {
    version: 1,
    layers: [
      {
        type: "gradientCircle",
        center: { x: 0.5, y: 0.5 },
        radius: 0.2,
        colors: ["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 0)"]
      },
      {
        type: "noise",
        amount: 0.15
      }
    ]
  };
  const stats = getRecipeStats(recipe);
  const normalized = normalizeRecipe(recipe);

  assert.deepEqual(normalized, recipe);
  assert.equal(stats.totalLayers, 2);
  assert.equal(stats.leafLayers, 2);
  assert.equal(stats.maxDepth, 1);
});

test("core: createRecipe normalizes rect cornerRadius defaults", () => {
  const recipe = createRecipe([
    {
      type: "rect",
      origin: { x: 0.1, y: 0.2 },
      size: { width: 0.4, height: 0.3 },
      color: "#ffffff"
    }
  ]);

  assert.equal(recipe.layers[0].cornerRadius, 0);
});

test("core: validateRecipe returns normalized recipes for valid input", () => {
  const result = validateRecipe({
    version: 1,
    layers: [
      {
        type: "gradientCircle",
        center: { x: 0.5, y: 0.5 },
        radius: 0.3,
        colors: ["#ffffff", "rgba(255,255,255,0)"]
      }
    ]
  });

  assert.equal(result.valid, true);
  assert.equal(result.normalizedRecipe.layers[0].type, "gradientCircle");
  assert.equal(result.stats.totalLayers, 1);
});

test("core: validateRecipe returns readable errors for invalid input", () => {
  const result = validateRecipe({
    version: 1,
    layers: [
      {
        type: "ring",
        center: { x: 0.5, y: 0.5 },
        innerRadius: 0.4,
        outerRadius: 0.2,
        color: "#ffffff"
      }
    ]
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.length > 0, true);
  assert.match(result.errors[0].path, /^\$/);
});

test("core: createEmptyRecipe returns an empty valid recipe", () => {
  const recipe = createEmptyRecipe();

  assert.equal(recipe.version, 1);
  assert.deepEqual(recipe.layers, []);
});

test("core: renderRecipe returns a PNG buffer", () => {
  const recipe = createRecipe([
    {
      type: "circle",
      center: { x: 0.5, y: 0.5 },
      radius: 0.25,
      color: "#ffffff"
    }
  ]);
  const buffer = renderRecipe(recipe, {
    width: 64,
    height: 64,
    seed: 1
  });

  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(buffer.length > 0, true);
});

function readPixel(canvas, x, y) {
  const context = canvas.getContext("2d");
  const { data } = context.getImageData(x, y, 1, 1);

  return {
    r: data[0],
    g: data[1],
    b: data[2],
    a: data[3]
  };
}

function createCircleLayer() {
  return {
    type: "circle",
    center: { x: 0.5, y: 0.5 },
    radius: 0.2,
    color: "#ffffff"
  };
}

test("core: pixel test for circle fill", () => {
  const recipe = createRecipe([
    {
      type: "circle",
      center: { x: 0.5, y: 0.5 },
      radius: 0.25,
      color: "rgba(255, 255, 255, 1)"
    }
  ]);
  const canvas = renderRecipeToCanvas(recipe, {
    width: 64,
    height: 64,
    seed: 1
  });
  const centerPixel = readPixel(canvas, 32, 32);
  const cornerPixel = readPixel(canvas, 0, 0);

  assert.deepEqual(centerPixel, {
    r: 255,
    g: 255,
    b: 255,
    a: 255
  });
  assert.deepEqual(cornerPixel, {
    r: 0,
    g: 0,
    b: 0,
    a: 0
  });
});

test("core: pixel test for ring keeps the center transparent", () => {
  const recipe = createRecipe([
    {
      type: "ring",
      center: { x: 0.5, y: 0.5 },
      innerRadius: 0.15,
      outerRadius: 0.25,
      color: "rgba(255, 0, 0, 1)"
    }
  ]);
  const canvas = renderRecipeToCanvas(recipe, {
    width: 64,
    height: 64,
    seed: 1
  });
  const centerPixel = readPixel(canvas, 32, 32);
  const ringPixel = readPixel(canvas, 44, 32);

  assert.equal(centerPixel.a, 0);
  assert.equal(ringPixel.r, 255);
  assert.equal(ringPixel.g, 0);
  assert.equal(ringPixel.b, 0);
  assert.equal(ringPixel.a, 255);
});

test("core: pixel test for gradientCircle fades from center to edge", () => {
  const recipe = createRecipe([
    {
      type: "gradientCircle",
      center: { x: 0.5, y: 0.5 },
      radius: 0.3,
      colors: ["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 0)"]
    }
  ]);
  const canvas = renderRecipeToCanvas(recipe, {
    width: 64,
    height: 64,
    seed: 1
  });
  const centerPixel = readPixel(canvas, 32, 32);
  const edgePixel = readPixel(canvas, 51, 32);
  const farPixel = readPixel(canvas, 0, 0);

  assert.equal(centerPixel.a > edgePixel.a, true);
  assert.equal(edgePixel.a >= farPixel.a, true);
  assert.equal(centerPixel.r >= edgePixel.r, true);
});

test("core: pixel test for rounded rect keeps corners transparent", () => {
  const recipe = createRecipe([
    {
      type: "rect",
      origin: { x: 0.25, y: 0.25 },
      size: { width: 0.5, height: 0.5 },
      cornerRadius: 0.2,
      color: "rgba(0, 255, 0, 1)"
    }
  ]);
  const canvas = renderRecipeToCanvas(recipe, {
    width: 64,
    height: 64,
    seed: 1
  });

  assert.equal(readPixel(canvas, 16, 16).a, 0);
  assert.equal(readPixel(canvas, 32, 32).g, 255);
});

test("core: pixel test for gradientRect follows its direction", () => {
  const recipe = createRecipe([
    {
      type: "gradientRect",
      origin: { x: 0.125, y: 0.25 },
      size: { width: 0.75, height: 0.5 },
      direction: "horizontal",
      colors: ["rgba(255, 0, 0, 1)", "rgba(0, 0, 255, 1)"]
    }
  ]);
  const canvas = renderRecipeToCanvas(recipe, {
    width: 64,
    height: 64,
    seed: 1
  });
  const leftPixel = readPixel(canvas, 10, 32);
  const rightPixel = readPixel(canvas, 53, 32);

  assert.equal(leftPixel.r > rightPixel.r, true);
  assert.equal(rightPixel.b > leftPixel.b, true);
});

test("core: pixel test for vertical gradientRect follows top-to-bottom colors", () => {
  const recipe = createRecipe([
    {
      type: "gradientRect",
      origin: { x: 0.25, y: 0.125 },
      size: { width: 0.5, height: 0.75 },
      direction: "vertical",
      colors: ["rgba(255, 0, 0, 1)", "rgba(0, 0, 255, 1)"]
    }
  ]);
  const canvas = renderRecipeToCanvas(recipe, {
    width: 64,
    height: 64,
    seed: 1
  });
  const topPixel = readPixel(canvas, 32, 10);
  const bottomPixel = readPixel(canvas, 32, 53);

  assert.equal(topPixel.r > bottomPixel.r, true);
  assert.equal(bottomPixel.b > topPixel.b, true);
});

test("core: noise lifts alpha across the current canvas", () => {
  const recipe = createRecipe([
    {
      type: "noise",
      amount: 0.25
    }
  ]);
  const canvas = renderRecipeToCanvas(recipe, {
    width: 32,
    height: 32,
    seed: 5
  });
  const samplePixel = readPixel(canvas, 12, 19);

  assert.equal(samplePixel.a >= Math.round(0.25 * 96), true);
  assert.equal(samplePixel.r, samplePixel.g);
  assert.equal(samplePixel.g, samplePixel.b);
});

test("core: renderRecipe is deterministic for the same seed", () => {
  const recipe = createRecipe([
    {
      type: "noise",
      amount: 0.3
    }
  ]);
  const first = renderRecipe(recipe, {
    width: 32,
    height: 32,
    seed: 77
  });
  const second = renderRecipe(recipe, {
    width: 32,
    height: 32,
    seed: 77
  });
  const third = renderRecipe(recipe, {
    width: 32,
    height: 32,
    seed: 78
  });

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, third);
});

test("core: createRecipe rejects recipes with too many total layers", () => {
  const layers = Array.from({ length: MAX_RECIPE_LAYERS + 1 }, () => createCircleLayer());

  assert.throws(
    () => createRecipe(layers),
    /must not exceed .* total layers/i
  );
});

test("core: blur acts on the current canvas result rather than future draws", () => {
  const blurredFirst = renderRecipeToCanvas(
    createRecipe([
      {
        type: "circle",
        center: { x: 0.5, y: 0.5 },
        radius: 0.18,
        color: "rgba(255, 255, 255, 1)"
      },
      {
        type: "blur",
        radius: 0.08
      }
    ]),
    {
      width: 64,
      height: 64,
      seed: 1
    }
  );
  const blurredLast = renderRecipeToCanvas(
    createRecipe([
      {
        type: "blur",
        radius: 0.08
      },
      {
        type: "circle",
        center: { x: 0.5, y: 0.5 },
        radius: 0.18,
        color: "rgba(255, 255, 255, 1)"
      }
    ]),
    {
      width: 64,
      height: 64,
      seed: 1
    }
  );

  assert.equal(readPixel(blurredFirst, 16, 32).a > 0, true);
  assert.equal(readPixel(blurredLast, 16, 32).a, 0);
});

test("core: blur with zero radius leaves the current canvas unchanged", () => {
  const recipe = createRecipe([
    {
      type: "circle",
      center: { x: 0.5, y: 0.5 },
      radius: 0.22,
      color: "rgba(255, 255, 255, 1)"
    },
    {
      type: "blur",
      radius: 0
    }
  ]);
  const blurred = renderRecipe(recipe, {
    width: 64,
    height: 64,
    seed: 3
  });
  const unblurred = renderRecipe(
    createRecipe([
      {
        type: "circle",
        center: { x: 0.5, y: 0.5 },
        radius: 0.22,
        color: "rgba(255, 255, 255, 1)"
      }
    ]),
    {
      width: 64,
      height: 64,
      seed: 3
    }
  );

  assert.deepEqual(blurred, unblurred);
});

test("core: renderRecipe rejects oversized dimensions", () => {
  assert.throws(
    () =>
      renderRecipe(createRecipe([createCircleLayer()]), {
        width: MAX_TEXTURE_DIMENSION + 1,
        height: 64,
        seed: 1
      }),
    /must not exceed .* pixels/i
  );
});

test("core: resolveExportPaths rejects absolute and escaping paths", async () => {
  const workspaceRoot = await mkdtemp(path.join(projectRoot, ".tmp-export-paths-"));

  try {
    assert.throws(
      () => resolveExportPaths(workspaceRoot, path.resolve(workspaceRoot, "absolute.png")),
      /must be relative/
    );
    assert.throws(
      () => resolveExportPaths(workspaceRoot, "../outside.png"),
      /must stay inside/
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("core: resolveExportPaths rejects junction-based workspace escapes", async () => {
  const workspaceRoot = await mkdtemp(path.join(projectRoot, ".tmp-export-junction-"));
  const outsideRoot = await mkdtemp(path.join(projectRoot, ".tmp-export-outside-"));
  const junctionPath = path.join(workspaceRoot, "linked-outside");

  try {
    await mkdir(path.join(outsideRoot, "nested"), { recursive: true });
    await symlink(outsideRoot, junctionPath, "junction");

    assert.throws(
      () => resolveExportPaths(workspaceRoot, path.join("linked-outside", "nested", "result.png")),
      /resolves outside the workspace root/i
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test("core: exportTexture writes image and meta files", async () => {
  const workspaceRoot = await mkdtemp(path.join(projectRoot, ".tmp-export-write-"));
  const generated = generateTexture({
    mode: "preset",
    preset: "glow",
    width: 48,
    height: 48,
    seed: 11
  });

  try {
    const exported = await exportTexture(generated, workspaceRoot, {
      outputPath: "nested/result.png",
      format: "png",
      saveMeta: true
    });
    const imageBytes = await readFile(exported.savedPath);
    const metaText = await readFile(exported.metaPath, "utf8");
    const savedMeta = JSON.parse(metaText);

    assert.equal(imageBytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(savedMeta.format, "png");
    assert.equal(savedMeta.width, 48);
    assert.equal(savedMeta.height, 48);
    assert.equal(savedMeta.seed, 11);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("core: exportTexture can encode jpeg output", async () => {
  const workspaceRoot = await mkdtemp(path.join(projectRoot, ".tmp-export-jpeg-"));
  const generated = generateTexture({
    mode: "recipe",
    recipe: createRecipe([
      {
        type: "circle",
        center: { x: 0.5, y: 0.5 },
        radius: 0.3,
        color: "#ffffff"
      }
    ]),
    width: 40,
    height: 40,
    seed: 5
  });

  try {
    const exported = await exportTexture(generated, workspaceRoot, {
      outputPath: "result.jpg",
      format: "jpeg",
      quality: 0.8
    });
    const imageBytes = await readFile(exported.savedPath);

    assert.equal(imageBytes.subarray(0, 3).toString("hex"), "ffd8ff");
    assert.equal(exported.format, "jpeg");
    assert.equal(exported.metaPath, undefined);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("core: exportTexture can encode webp output", async () => {
  const workspaceRoot = await mkdtemp(path.join(projectRoot, ".tmp-export-webp-"));
  const generated = generateTexture({
    mode: "preset",
    preset: "panel",
    width: 64,
    height: 40,
    seed: 9
  });

  try {
    const exported = await exportTexture(generated, workspaceRoot, {
      outputPath: "result.webp",
      format: "webp",
      quality: 0.9
    });
    const imageBytes = await readFile(exported.savedPath);

    assert.equal(imageBytes.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(imageBytes.subarray(8, 12).toString("ascii"), "WEBP");
    assert.equal(exported.format, "webp");
    assert.equal(exported.metaPath, undefined);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("core: generateTexture resolves preset params into recipe and meta", () => {
  const generated = generateTexture({
    mode: "preset",
    preset: "ring",
    params: {
      softness: 0.4
    },
    width: 256,
    height: 128,
    seed: 123
  });

  assert.equal(generated.output.seed, 123);
  assert.equal(generated.output.preset, "ring");
  assert.equal(generated.meta.width, 256);
  assert.equal(generated.meta.height, 128);
  assert.equal(generated.meta.params.thickness, 0.2);
  assert.equal(generated.meta.params.softness, 0.4);
  assert.equal(generated.recipe.layers.length > 0, true);
  assert.equal(generated.imageBuffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(generated.output.message, "Texture rendered and stored as the current result.");
});

test("core: generateTexture preserves explicit recipe input", () => {
  const recipe = {
    version: 1,
    layers: [
      {
        type: "circle",
        center: { x: 0.5, y: 0.5 },
        radius: 0.25,
        color: "#ffffff"
      }
    ]
  };
  const generated = generateTexture({
    mode: "recipe",
    recipe,
    width: 64,
    height: 64,
    seed: 9
  });

  assert.deepEqual(generated.recipe, recipe);
  assert.equal(generated.meta.preset, undefined);
  assert.equal(generated.meta.params, undefined);
  assert.equal(generated.output.seed, 9);
});

test("core: generateTexture uses the default seed when none is provided", () => {
  const first = generateTexture({
    mode: "preset",
    preset: "glow",
    width: 64,
    height: 64
  });
  const second = generateTexture({
    mode: "preset",
    preset: "glow",
    width: 64,
    height: 64
  });

  assert.equal(first.output.seed, DEFAULT_TEXTURE_SEED);
  assert.equal(first.meta.seed, DEFAULT_TEXTURE_SEED);
  assert.equal(second.output.seed, DEFAULT_TEXTURE_SEED);
  assert.deepEqual(first.recipe, second.recipe);
  assert.deepEqual(first.imageBuffer, second.imageBuffer);
});

test("core: generateTexture rejects requests with oversized texture area", () => {
  assert.throws(
    () =>
      generateTexture({
        mode: "preset",
        preset: "glow",
        width: 4096,
        height: 2048,
        seed: 1
      }),
    /texture area must not exceed/i
  );
});

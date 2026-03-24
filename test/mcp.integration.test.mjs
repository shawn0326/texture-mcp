import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const entryFile = path.join(projectRoot, "dist", "mcp", "index.js");
const protocolVersion = "2025-03-26";

async function createMcpSession() {
  const child = spawn(process.execPath, [entryFile], {
    cwd: projectRoot,
    stdio: ["pipe", "pipe", "pipe"]
  });

  let stdoutBuffer = "";
  let stderr = "";
  let nextId = 1;
  const pending = new Map();

  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk.toString();

    while (true) {
      const newlineIndex = stdoutBuffer.indexOf("\n");

      if (newlineIndex === -1) {
        break;
      }

      const line = stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, "");
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

      if (!line.trim()) {
        continue;
      }

      const message = JSON.parse(line);

      if ("id" in message && pending.has(message.id)) {
        const requestState = pending.get(message.id);
        clearTimeout(requestState.timeout);
        pending.delete(message.id);

        if ("error" in message) {
          requestState.reject(
            new Error(`MCP request failed: ${JSON.stringify(message.error)}`)
          );
        } else {
          requestState.resolve(message.result);
        }
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("exit", (code, signal) => {
    for (const [, requestState] of pending) {
      clearTimeout(requestState.timeout);
      requestState.reject(
        new Error(
          `MCP process exited unexpectedly (code=${code}, signal=${signal}).\nstderr:\n${stderr}`
        )
      );
    }

    pending.clear();
  });

  function sendMessage(message) {
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  function request(method, params) {
    const id = nextId++;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out waiting for MCP response to ${method}.\nstderr:\n${stderr}`));
      }, 5000);

      pending.set(id, { resolve, reject, timeout });

      sendMessage({
        jsonrpc: "2.0",
        id,
        method,
        params
      });
    });
  }

  function notify(method, params) {
    sendMessage({
      jsonrpc: "2.0",
      method,
      params
    });
  }

  const initializeResult = await request("initialize", {
    protocolVersion,
    capabilities: {},
    clientInfo: {
      name: "texture-mcp-test",
      version: "0.1.0"
    }
  });

  notify("notifications/initialized", {});

  return {
    initializeResult,
    request,
    getStderr: () => stderr,
    async close() {
      if (!child.killed) {
        child.kill();
      }

      await once(child, "exit").catch(() => undefined);
    }
  };
}

test("mcp integration: initialize and list tools", async () => {
  const session = await createMcpSession();

  try {
    assert.ok(session.initializeResult.capabilities.tools);

    const toolListResult = await session.request("tools/list", {});
    const toolNames = toolListResult.tools.map((tool) => tool.name).sort();
    const generateTool = toolListResult.tools.find((tool) => tool.name === "generate_texture");
    const exportTool = toolListResult.tools.find((tool) => tool.name === "export_texture");
    const validateTool = toolListResult.tools.find((tool) => tool.name === "validate_recipe");

    assert.deepEqual(toolNames, [
      "export_texture",
      "generate_texture",
      "get_layer_schema",
      "get_preset_schema",
      "list_layer_types",
      "list_presets",
      "validate_recipe"
    ]);
    assert.match(generateTool.description, /preset/i);
    assert.match(generateTool.description, /recipe/i);
    assert.match(generateTool.description, /seed/i);
    assert.match(exportTool.description, /workspaceRoot/i);
    assert.match(exportTool.description, /generate_texture/i);
    assert.match(validateTool.description, /normalizedRecipe/);
  } finally {
    await session.close();
  }
});

test("mcp integration: placeholder info tools return structured results", async () => {
  const session = await createMcpSession();

  try {
    const presetsResult = await session.request("tools/call", {
      name: "list_presets",
      arguments: {}
    });

    assert.notEqual(presetsResult.isError, true, session.getStderr());
    assert.equal(presetsResult.structuredContent.count, 6);
    assert.equal(presetsResult.structuredContent.presets.length, 6);
    assert.match(presetsResult.content[0].text, /get_preset_schema/);
    assert.deepEqual(
      presetsResult.structuredContent.presets.map((preset) => preset.name).sort(),
      ["beam", "colorRamp", "glow", "panel", "ring", "smoke"]
    );

    const schemaResult = await session.request("tools/call", {
      name: "get_preset_schema",
      arguments: {
        preset: "colorRamp"
      }
    });

    assert.notEqual(schemaResult.isError, true, session.getStderr());
    assert.equal(schemaResult.structuredContent.name, "colorRamp");
    assert.equal(schemaResult.structuredContent.mode, "preset");
    assert.equal(schemaResult.structuredContent.paramCount, 5);
    assert.deepEqual(schemaResult.structuredContent.paramNames, [
      "palette",
      "orientation",
      "thickness",
      "padding",
      "cornerRadius"
    ]);
    assert.equal(schemaResult.structuredContent.defaultParams.palette, "heat");
    assert.match(schemaResult.content[0].text, /defaultParams/);
    assert.match(schemaResult.content[0].text, /generate_texture/);

    const layerTypesResult = await session.request("tools/call", {
      name: "list_layer_types",
      arguments: {}
    });

    assert.notEqual(layerTypesResult.isError, true, session.getStderr());
    assert.equal(layerTypesResult.structuredContent.count, 8);
    assert.equal(layerTypesResult.structuredContent.layers.length, 8);
    assert.match(layerTypesResult.content[0].text, /get_layer_schema/);

    const layerSchemaResult = await session.request("tools/call", {
      name: "get_layer_schema",
      arguments: {
        type: "text"
      }
    });

    assert.notEqual(layerSchemaResult.isError, true, session.getStderr());
    assert.equal(layerSchemaResult.structuredContent.type, "text");
    assert.equal(layerSchemaResult.structuredContent.category, "draw");
    assert.equal(layerSchemaResult.structuredContent.mode, "recipe");
    assert.deepEqual(layerSchemaResult.structuredContent.parameterNames, [
      "text",
      "origin",
      "size",
      "color",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "align",
      "verticalAlign",
      "clip"
    ]);
    assert.deepEqual(layerSchemaResult.structuredContent.constraintFields, ["text"]);
    assert.equal(layerSchemaResult.structuredContent.exampleCount, 1);
    assert.match(layerSchemaResult.content[0].text, /examples/);

    const validateResult = await session.request("tools/call", {
      name: "validate_recipe",
      arguments: {
        recipe: {
          version: 1,
          layers: [
            {
              type: "text",
              text: "OK",
              origin: { x: 0.2, y: 0.2 },
              size: { width: 0.6, height: 0.2 },
              color: "#ffffff"
            }
          ]
        }
      }
    });

    assert.notEqual(validateResult.isError, true, session.getStderr());
    assert.equal(validateResult.structuredContent.valid, true);
    assert.equal(validateResult.structuredContent.errorCount, 0);
    assert.equal(validateResult.structuredContent.readyForGeneration, true);
    assert.equal(validateResult.structuredContent.normalizedRecipe.layers[0].type, "text");
    assert.match(validateResult.content[0].text, /generate_texture/);
  } finally {
    await session.close();
  }
});

test("mcp integration: invalid calls return tool errors", async () => {
  const session = await createMcpSession();

  try {
    const unknownPresetResult = await session.request("tools/call", {
      name: "get_preset_schema",
      arguments: {
        preset: "unknown"
      }
    });

    assert.equal(unknownPresetResult.isError, true, session.getStderr());
    assert.match(unknownPresetResult.content[0].text, /Unknown preset/);
    assert.match(unknownPresetResult.content[0].text, /list_presets/);

    const exportWithoutGenerateResult = await session.request("tools/call", {
      name: "export_texture",
      arguments: {
        outputPath: "out/test.png",
        format: "png"
      }
    });

    assert.equal(exportWithoutGenerateResult.isError, true, session.getStderr());
    assert.match(exportWithoutGenerateResult.content[0].text, /Run `generate_texture` first/);
    assert.match(exportWithoutGenerateResult.content[0].text, /workspaceRoot/);

    const oversizedGenerateResult = await session.request("tools/call", {
      name: "generate_texture",
      arguments: {
        mode: "preset",
        preset: "glow",
        width: 5000,
        height: 64
      }
    });

    assert.equal(oversizedGenerateResult.isError, true, session.getStderr());
    assert.match(oversizedGenerateResult.content[0].text, /4096/);

    const invalidRecipeResult = await session.request("tools/call", {
      name: "validate_recipe",
      arguments: {
        recipe: {
          version: 1,
          layers: [
            {
              type: "ring",
              center: { x: 0.5, y: 0.5 },
              innerRadius: 0.5,
              outerRadius: 0.2,
              color: "#ffffff"
            }
          ]
        }
      }
    });

    assert.equal(invalidRecipeResult.isError, undefined, session.getStderr());
    assert.equal(invalidRecipeResult.structuredContent.valid, false);
    assert.equal(invalidRecipeResult.structuredContent.readyForGeneration, false);
    assert.equal(invalidRecipeResult.structuredContent.errors.length > 0, true);
    assert.equal(invalidRecipeResult.structuredContent.errorCount > 0, true);
    assert.match(invalidRecipeResult.content[0].text, /get_layer_schema/);
  } finally {
    await session.close();
  }
});

test("mcp integration: generate then export validates the current result", async () => {
  const session = await createMcpSession();
  const outputPath = path.join(
    "test-output",
    `mcp-export-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}.png`
  );
  const absoluteSavedPath = path.resolve(projectRoot, outputPath);
  const absoluteMetaPath = `${absoluteSavedPath}.meta.json`;

  try {
    const generateResult = await session.request("tools/call", {
      name: "generate_texture",
      arguments: {
        mode: "preset",
        preset: "ring",
        params: {
          thickness: 0.2
        },
        width: 256,
        height: 128,
        seed: 123
      }
    });

    assert.notEqual(generateResult.isError, true, session.getStderr());
    assert.equal(generateResult.structuredContent.mode, "preset");
    assert.equal(generateResult.structuredContent.width, 256);
    assert.equal(generateResult.structuredContent.height, 128);
    assert.equal(generateResult.structuredContent.seed, 123);
    assert.equal(generateResult.structuredContent.preset, "ring");
    assert.equal(generateResult.structuredContent.usedDefaultSeed, false);
    assert.equal(generateResult.structuredContent.currentResultAvailable, true);
    assert.equal(generateResult.structuredContent.recipeLayerCount > 0, true);
    assert.match(generateResult.content[0].text, /export_texture/);
    assert.match(generateResult.content[0].text, /seed 123/);

    const absolutePathResult = await session.request("tools/call", {
      name: "export_texture",
      arguments: {
        outputPath: path.resolve(projectRoot, "out/absolute.png"),
        format: "png"
      }
    });

    assert.equal(absolutePathResult.isError, true, session.getStderr());
    assert.match(absolutePathResult.content[0].text, /must be relative/);

    const escapePathResult = await session.request("tools/call", {
      name: "export_texture",
      arguments: {
        outputPath: "../outside.png",
        format: "png"
      }
    });

    assert.equal(escapePathResult.isError, true, session.getStderr());
    assert.match(escapePathResult.content[0].text, /must stay inside/);

    const exportResult = await session.request("tools/call", {
      name: "export_texture",
      arguments: {
        outputPath,
        format: "png",
        saveMeta: true
      }
    });

    assert.notEqual(exportResult.isError, true, session.getStderr());
    assert.equal(exportResult.structuredContent.format, "png");
    assert.equal(exportResult.structuredContent.width, 256);
    assert.equal(exportResult.structuredContent.height, 128);
    assert.equal(exportResult.structuredContent.savedPath, absoluteSavedPath);
    assert.equal(exportResult.structuredContent.metaPath, absoluteMetaPath);
    assert.equal(exportResult.structuredContent.sourceMode, "preset");
    assert.equal(exportResult.structuredContent.preset, "ring");
    assert.equal(exportResult.structuredContent.seed, 123);
    assert.equal(exportResult.structuredContent.metaSaved, true);
    assert.match(exportResult.content[0].text, /meta/i);

    const imageBytes = await readFile(absoluteSavedPath);
    const metaText = await readFile(absoluteMetaPath, "utf8");
    const meta = JSON.parse(metaText);

    assert.equal(imageBytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(meta.format, "png");
    assert.equal(meta.width, 256);
    assert.equal(meta.height, 128);
  } finally {
    await rm(absoluteSavedPath, { force: true }).catch(() => undefined);
    await rm(absoluteMetaPath, { force: true }).catch(() => undefined);
    await session.close();
  }
});

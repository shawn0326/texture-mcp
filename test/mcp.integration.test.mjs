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
const packageVersion = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8")).version;

function encodeMessage(message, framing) {
  const payload = JSON.stringify(message);

  if (framing === "content-length") {
    return `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`;
  }

  return `${payload}\n`;
}

function parseJsonLines(buffer) {
  const messages = [];
  let remaining = buffer;

  while (true) {
    const newlineIndex = remaining.indexOf("\n");

    if (newlineIndex === -1) {
      break;
    }

    const line = remaining.slice(0, newlineIndex).replace(/\r$/, "");
    remaining = remaining.slice(newlineIndex + 1);

    if (!line.trim()) {
      continue;
    }

    messages.push(JSON.parse(line));
  }

  return { messages, remaining };
}

function parseContentLengthMessages(buffer) {
  const messages = [];
  let remaining = buffer;

  while (true) {
    const separatorIndex = remaining.indexOf("\r\n\r\n");
    const separatorLength = separatorIndex === -1 ? 0 : 4;
    const fallbackSeparatorIndex = separatorIndex === -1 ? remaining.indexOf("\n\n") : -1;
    const headerIndex = separatorIndex === -1 ? fallbackSeparatorIndex : separatorIndex;
    const headerLength = separatorIndex === -1 ? 2 : separatorLength;

    if (headerIndex === -1) {
      break;
    }

    const headerText = remaining.slice(0, headerIndex);
    const contentLengthMatch = /^content-length\s*:\s*(\d+)$/im.exec(headerText);

    assert.ok(contentLengthMatch, `Missing Content-Length header.\nHeader:\n${headerText}`);

    const contentLength = Number.parseInt(contentLengthMatch[1], 10);
    const bodyStart = headerIndex + headerLength;
    const bodyEnd = bodyStart + contentLength;

    if (remaining.length < bodyEnd) {
      break;
    }

    const payload = remaining.slice(bodyStart, bodyEnd);
    messages.push(JSON.parse(payload));
    remaining = remaining.slice(bodyEnd);
  }

  return { messages, remaining };
}

async function createMcpSession(options = {}) {
  const framing = options.framing ?? "jsonl";
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

    const parsed =
      framing === "content-length"
        ? parseContentLengthMessages(stdoutBuffer)
        : parseJsonLines(stdoutBuffer);

    stdoutBuffer = parsed.remaining;

    for (const message of parsed.messages) {
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
    child.stdin.write(encodeMessage(message, framing));
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
    assert.ok(session.initializeResult.capabilities.resources);
    assert.ok(session.initializeResult.capabilities.prompts);
    assert.equal(session.initializeResult.serverInfo.name, "texture-mcp");
    assert.equal(session.initializeResult.serverInfo.version, packageVersion);
    assert.equal(session.initializeResult.capabilities.resources.subscribe, false);
    assert.equal(session.initializeResult.capabilities.resources.listChanged, false);
    assert.equal(session.initializeResult.capabilities.prompts.listChanged, false);

    const toolListResult = await session.request("tools/list", {});
    const toolNames = toolListResult.tools.map((tool) => tool.name).sort();
    const generateTool = toolListResult.tools.find((tool) => tool.name === "generate_texture");
    const exportTool = toolListResult.tools.find((tool) => tool.name === "export_texture");
    const resolveTool = toolListResult.tools.find((tool) => tool.name === "resolve_preset");
    const workspaceTool = toolListResult.tools.find((tool) => tool.name === "get_workspace_info");
    const validateTool = toolListResult.tools.find((tool) => tool.name === "validate_recipe");

    assert.deepEqual(toolNames, [
      "export_texture",
      "generate_texture",
      "get_layer_schema",
      "get_preset_schema",
      "get_workspace_info",
      "list_layer_types",
      "list_presets",
      "resolve_preset",
      "validate_recipe"
    ]);
    assert.match(generateTool.description, /preset/i);
    assert.match(generateTool.description, /recipe/i);
    assert.match(generateTool.description, /seed/i);
    assert.match(generateTool.description, /128/);
    assert.match(resolveTool.description, /normalized recipe/i);
    assert.match(resolveTool.description, /without rendering/i);
    assert.match(resolveTool.description, /128/);
    assert.match(exportTool.description, /workspaceRoot/i);
    assert.match(exportTool.description, /generate_texture/i);
    assert.match(workspaceTool.description, /workspaceRoot/i);
    assert.match(workspaceTool.description, /cwd/i);
    assert.match(validateTool.description, /normalizedRecipe/);
    assert.match(validateTool.description, /128/);
  } finally {
    await session.close();
  }
});

test("mcp integration: initialize and list tools over content-length framing", async () => {
  const session = await createMcpSession({ framing: "content-length" });

  try {
    assert.ok(session.initializeResult.capabilities.tools);
    assert.ok(session.initializeResult.capabilities.resources);
    assert.ok(session.initializeResult.capabilities.prompts);
    assert.equal(session.initializeResult.serverInfo.version, packageVersion);

    const toolListResult = await session.request("tools/list", {});
    const toolNames = toolListResult.tools.map((tool) => tool.name).sort();
    const resourcesResult = await session.request("resources/list", {});
    const promptsResult = await session.request("prompts/list", {});

    assert.equal(toolNames.includes("generate_texture"), true);
    assert.equal(toolNames.includes("export_texture"), true);
    assert.equal(toolNames.includes("get_workspace_info"), true);
    assert.equal(toolNames.includes("resolve_preset"), true);
    assert.equal(toolNames.includes("validate_recipe"), true);
    assert.equal(resourcesResult.resources.length, 4);
    assert.equal(promptsResult.prompts.length, 2);
  } finally {
    await session.close();
  }
});

test("mcp integration: resources and prompts are discoverable", async () => {
  const session = await createMcpSession();

  try {
    const resourcesResult = await session.request("resources/list", {});

    assert.equal(resourcesResult.resources.length, 4);
    assert.deepEqual(
      resourcesResult.resources.map((resource) => resource.uri),
      [
        "texture://docs/layer-reference",
        "texture://docs/preset-playbook",
        "texture://docs/recipe-examples",
        "texture://docs/workflow-guardrails"
      ]
    );
    assert.equal(resourcesResult.resources.every((resource) => resource.mimeType === "text/markdown"), true);

    const templatesResult = await session.request("resources/templates/list", {});

    assert.deepEqual(templatesResult.resourceTemplates, []);

    for (const uri of resourcesResult.resources.map((resource) => resource.uri)) {
      const readResult = await session.request("resources/read", { uri });

      assert.equal(readResult.contents.length, 1);
      assert.equal(readResult.contents[0].uri, uri);
      assert.equal(readResult.contents[0].mimeType, "text/markdown");
      assert.equal(typeof readResult.contents[0].text, "string");
      assert.equal(readResult.contents[0].text.length > 40, true);
    }

    const promptsResult = await session.request("prompts/list", {});

    assert.deepEqual(
      promptsResult.prompts.map((prompt) => prompt.name),
      ["recommended_preset_workflow", "recommended_recipe_workflow"]
    );
    assert.equal(promptsResult.prompts.every((prompt) => !prompt.arguments || prompt.arguments.length === 0), true);

    const presetPromptResult = await session.request("prompts/get", {
      name: "recommended_preset_workflow"
    });
    const recipePromptResult = await session.request("prompts/get", {
      name: "recommended_recipe_workflow"
    });

    assert.equal(presetPromptResult.messages.length, 1);
    assert.equal(presetPromptResult.messages[0].role, "user");
    assert.match(presetPromptResult.messages[0].content.text, /list_presets/);
    assert.match(presetPromptResult.messages[0].content.text, /128/);
    assert.match(presetPromptResult.messages[0].content.text, /texture:\/\/docs\/preset-playbook/);
    assert.match(recipePromptResult.messages[0].content.text, /validate_recipe/);
    assert.match(recipePromptResult.messages[0].content.text, /128/);
    assert.match(recipePromptResult.messages[0].content.text, /texture:\/\/docs\/layer-reference/);
  } finally {
    await session.close();
  }
});

test("mcp integration: placeholder info tools return structured results", async () => {
  const session = await createMcpSession();

  try {
    const workspaceInfoResult = await session.request("tools/call", {
      name: "get_workspace_info",
      arguments: {}
    });

    assert.notEqual(workspaceInfoResult.isError, true, session.getStderr());
    assert.equal(workspaceInfoResult.structuredContent.workspaceRoot, projectRoot);
    assert.equal(workspaceInfoResult.structuredContent.workspaceRootSource, "cwd");
    assert.equal(workspaceInfoResult.structuredContent.cwd, projectRoot);
    assert.equal(workspaceInfoResult.structuredContent.exportPolicy.requiresRelativeOutputPath, true);
    assert.equal(workspaceInfoResult.structuredContent.exportPolicy.mustStayInsideWorkspaceRoot, true);
    assert.equal(
      workspaceInfoResult.structuredContent.exportPolicy.blocksSymlinkOrJunctionEscape,
      true
    );
    assert.match(workspaceInfoResult.content[0].text, /workspaceRoot/);
    assert.match(workspaceInfoResult.content[0].text, /TEXTURE_MCP_WORKSPACE/);

    const presetsResult = await session.request("tools/call", {
      name: "list_presets",
      arguments: {}
    });

    assert.notEqual(presetsResult.isError, true, session.getStderr());
    assert.equal(presetsResult.structuredContent.count, 9);
    assert.equal(presetsResult.structuredContent.presets.length, 9);
    assert.match(presetsResult.content[0].text, /get_preset_schema/);
    assert.match(presetsResult.content[0].text, /commonUses/);
    assert.deepEqual(
      presetsResult.structuredContent.presets.map((preset) => preset.name).sort(),
      ["beam", "colorRamp", "flare", "glow", "panel", "ring", "shockwave", "smoke", "softMask"]
    );
    assert.deepEqual(
      presetsResult.structuredContent.presets.find((preset) => preset.name === "beam").primaryParams,
      ["orientation", "length", "thickness", "intensity"]
    );
    assert.equal(
      presetsResult.structuredContent.presets.find((preset) => preset.name === "beam").commonUses.includes(
        "energy beams"
      ),
      true
    );
    assert.equal(
      presetsResult.structuredContent.presets.find((preset) => preset.name === "flare").commonUses.includes(
        "pickup sprites"
      ),
      true
    );
    assert.equal(
      presetsResult.structuredContent.presets.find((preset) => preset.name === "softMask").commonUses.includes(
        "soft particle masks"
      ),
      true
    );
    assert.equal(
      presetsResult.structuredContent.presets.find((preset) => preset.name === "shockwave").commonUses.includes(
        "impact pulses"
      ),
      true
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
    assert.deepEqual(schemaResult.structuredContent.requiredParamNames, []);
    assert.deepEqual(schemaResult.structuredContent.schemaRequiredParamNames, [
      "palette",
      "orientation",
      "thickness",
      "padding",
      "cornerRadius"
    ]);
    assert.equal(schemaResult.structuredContent.defaultParams.palette, "heat");
    assert.equal(schemaResult.structuredContent.parameterSemantics.palette.includes("built-in color sequences"), true);
    assert.deepEqual(schemaResult.structuredContent.primaryParams, [
      "palette",
      "orientation",
      "thickness"
    ]);
    assert.equal(schemaResult.structuredContent.commonUses.includes("heatmaps"), true);
    assert.equal(schemaResult.structuredContent.tuningNotes.length > 0, true);
    assert.deepEqual(schemaResult.structuredContent.compilesToLayerTypes, ["gradientRect"]);
    assert.match(schemaResult.content[0].text, /defaultParams/);
    assert.match(schemaResult.content[0].text, /requiredParamNames/);
    assert.match(schemaResult.content[0].text, /schemaRequiredParamNames/);
    assert.match(schemaResult.content[0].text, /parameterSemantics/);
    assert.match(schemaResult.content[0].text, /resolve_preset/);

    const resolveResult = await session.request("tools/call", {
      name: "resolve_preset",
      arguments: {
        preset: "ring",
        params: {
          softness: 0.4
        }
      }
    });

    assert.notEqual(resolveResult.isError, true, session.getStderr());
    assert.equal(resolveResult.structuredContent.preset, "ring");
    assert.equal(resolveResult.structuredContent.resolvedParams.thickness, 0.2);
    assert.equal(resolveResult.structuredContent.resolvedParams.softness, 0.4);
    assert.equal(resolveResult.structuredContent.recipe.version, 1);
    assert.equal(
      resolveResult.structuredContent.recipeLayerCount,
      resolveResult.structuredContent.recipe.layers.length
    );
    assert.deepEqual(resolveResult.structuredContent.compilesToLayerTypes, ["ring", "blur"]);
    assert.match(resolveResult.content[0].text, /does not create a current in-memory result/);
    assert.match(resolveResult.content[0].text, /generate_texture/);

    const layerTypesResult = await session.request("tools/call", {
      name: "list_layer_types",
      arguments: {}
    });

    assert.notEqual(layerTypesResult.isError, true, session.getStderr());
    assert.equal(layerTypesResult.structuredContent.count, 8);
    assert.equal(layerTypesResult.structuredContent.layers.length, 8);
    assert.match(layerTypesResult.content[0].text, /applicationScope/);
    assert.deepEqual(
      layerTypesResult.structuredContent.layers.find((layer) => layer.type === "blur").primaryParameters,
      ["radius"]
    );
    assert.equal(
      layerTypesResult.structuredContent.layers.find((layer) => layer.type === "blur").applicationScope,
      "fullscreen"
    );
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
    assert.deepEqual(layerSchemaResult.structuredContent.primaryParameters, [
      "text",
      "origin",
      "size",
      "color"
    ]);
    assert.deepEqual(layerSchemaResult.structuredContent.parameterNames, [
      "text",
      "origin",
      "size",
      "rotation",
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
    assert.equal(layerSchemaResult.structuredContent.applicationScope, "local");
    assert.equal(
      layerSchemaResult.structuredContent.parameterSemantics.rotation.includes("degrees"),
      true
    );
    assert.match(layerSchemaResult.content[0].text, /applicationScope/);
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
    assert.match(validateResult.content[0].text, /normalizedRecipe/);
    assert.match(validateResult.content[0].text, /Do not JSON-stringify the recipe/i);
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

    const invalidResolveResult = await session.request("tools/call", {
      name: "resolve_preset",
      arguments: {
        preset: "glow",
        width: 64
      }
    });

    assert.equal(invalidResolveResult.isError, true, session.getStderr());
    assert.match(invalidResolveResult.content[0].text, /Invalid arguments/);
    assert.match(invalidResolveResult.content[0].text, /width/i);

    await assert.rejects(
      session.request("resources/read", {
        uri: "texture://docs/missing"
      }),
      /Resource .* not found/
    );

    await assert.rejects(
      session.request("prompts/get", {
        name: "missing_prompt"
      }),
      /Prompt missing_prompt not found/
    );

    await assert.rejects(
      session.request("prompts/get", {
        name: "recommended_preset_workflow",
        arguments: {
          unexpected: "value"
        }
      }),
      /does not accept arguments/
    );

    const exportWithoutGenerateResult = await session.request("tools/call", {
      name: "export_texture",
      arguments: {
        outputPath: "out/test.png",
        format: "png"
      }
    });

    assert.equal(exportWithoutGenerateResult.isError, true, session.getStderr());
    assert.match(exportWithoutGenerateResult.content[0].text, /Run `generate_texture` first/);
    assert.match(exportWithoutGenerateResult.content[0].text, /get_workspace_info/);
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

    const presetModeWithRecipeResult = await session.request("tools/call", {
      name: "generate_texture",
      arguments: {
        mode: "preset",
        preset: "glow",
        recipe: {
          version: 1,
          layers: [
            {
              type: "circle",
              center: { x: 0.5, y: 0.5 },
              radius: 0.25,
              color: "#ffffff"
            }
          ]
        },
        width: 64,
        height: 64
      }
    });

    assert.equal(presetModeWithRecipeResult.isError, true, session.getStderr());
    assert.match(presetModeWithRecipeResult.content[0].text, /Invalid arguments/);
    assert.match(presetModeWithRecipeResult.content[0].text, /recipe/i);

    const recipeModeWithPresetResult = await session.request("tools/call", {
      name: "generate_texture",
      arguments: {
        mode: "recipe",
        recipe: {
          version: 1,
          layers: [
            {
              type: "circle",
              center: { x: 0.5, y: 0.5 },
              radius: 0.25,
              color: "#ffffff"
            }
          ]
        },
        preset: "glow",
        params: {
          intensity: 0.8
        },
        width: 64,
        height: 64
      }
    });

    assert.equal(recipeModeWithPresetResult.isError, true, session.getStderr());
    assert.match(recipeModeWithPresetResult.content[0].text, /Invalid arguments/);
    assert.match(recipeModeWithPresetResult.content[0].text, /preset|params/i);

    const stringifiedRecipeGenerateResult = await session.request("tools/call", {
      name: "generate_texture",
      arguments: {
        mode: "recipe",
        recipe: "{\"version\":1,\"layers\":[]}",
        width: 64,
        height: 64
      }
    });

    assert.equal(stringifiedRecipeGenerateResult.isError, true, session.getStderr());
    assert.match(stringifiedRecipeGenerateResult.content[0].text, /Recipe must be an object/i);
    assert.match(stringifiedRecipeGenerateResult.content[0].text, /JSON string/i);

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

    const stringifiedRecipeValidateResult = await session.request("tools/call", {
      name: "validate_recipe",
      arguments: {
        recipe: "{\"version\":1,\"layers\":[]}"
      }
    });

    assert.equal(stringifiedRecipeValidateResult.isError, true, session.getStderr());
    assert.match(stringifiedRecipeValidateResult.content[0].text, /Recipe must be an object/i);
    assert.match(stringifiedRecipeValidateResult.content[0].text, /JSON string/i);
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

test("mcp integration: resolve_preset does not create a current result and matches preset generation", async () => {
  const session = await createMcpSession();
  const outputPath = path.join(
    "test-output",
    `mcp-resolve-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}.png`
  );
  const absoluteSavedPath = path.resolve(projectRoot, outputPath);
  const absoluteMetaPath = `${absoluteSavedPath}.meta.json`;

  try {
    const resolveResult = await session.request("tools/call", {
      name: "resolve_preset",
      arguments: {
        preset: "shockwave",
        params: {
          radius: 0.34,
          thickness: 0.12,
          softness: 0.4
        }
      }
    });

    assert.notEqual(resolveResult.isError, true, session.getStderr());

    const exportWithoutGenerateResult = await session.request("tools/call", {
      name: "export_texture",
      arguments: {
        outputPath: "out/test.png",
        format: "png"
      }
    });

    assert.equal(exportWithoutGenerateResult.isError, true, session.getStderr());
    assert.match(exportWithoutGenerateResult.content[0].text, /Run `generate_texture` first/);

    const generateResult = await session.request("tools/call", {
      name: "generate_texture",
      arguments: {
        mode: "preset",
        preset: "shockwave",
        params: {
          radius: 0.34,
          thickness: 0.12,
          softness: 0.4
        },
        width: 256,
        height: 256,
        seed: 7
      }
    });

    assert.notEqual(generateResult.isError, true, session.getStderr());
    const exportResult = await session.request("tools/call", {
      name: "export_texture",
      arguments: {
        outputPath,
        format: "png",
        saveMeta: true
      }
    });

    assert.notEqual(exportResult.isError, true, session.getStderr());

    const exportedMeta = JSON.parse(await readFile(absoluteMetaPath, "utf8"));

    assert.deepEqual(resolveResult.structuredContent.resolvedParams, exportedMeta.params);
    assert.deepEqual(resolveResult.structuredContent.recipe, exportedMeta.recipe);
  } finally {
    await rm(absoluteSavedPath, { force: true }).catch(() => undefined);
    await rm(absoluteMetaPath, { force: true }).catch(() => undefined);
    await session.close();
  }
});

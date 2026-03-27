import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const {
  getWorkflowPrompt,
  listReferenceResources,
  listWorkflowPrompts,
  readReferenceResource
} = await import(pathToFileURL(path.join(projectRoot, "dist", "mcp", "discovery.js")).href);

test("discovery: listReferenceResources returns the fixed runtime resource catalog", () => {
  const resources = listReferenceResources();

  assert.equal(resources.length, 4);
  assert.deepEqual(
    resources.map((resource) => resource.uri),
    [
      "texture://docs/layer-reference",
      "texture://docs/preset-playbook",
      "texture://docs/recipe-examples",
      "texture://docs/workflow-guardrails"
    ]
  );
  assert.equal(resources.every((resource) => resource.mimeType === "text/markdown"), true);
});

test("discovery: readReferenceResource returns runtime-generated markdown", () => {
  const layerReference = readReferenceResource("texture://docs/layer-reference");
  const presetPlaybook = readReferenceResource("texture://docs/preset-playbook");
  const workflowGuardrails = readReferenceResource("texture://docs/workflow-guardrails");

  assert.ok(layerReference);
  assert.ok(presetPlaybook);
  assert.ok(workflowGuardrails);
  assert.match(layerReference.text, /applicationScope/);
  assert.match(layerReference.text, /primary parameters/i);
  assert.match(presetPlaybook.text, /primaryParams/);
  assert.match(presetPlaybook.text, /compiles to layer types/i);
  assert.match(presetPlaybook.text, /resolve_preset/);
  assert.match(workflowGuardrails.text, /workspaceRoot/);
  assert.match(workflowGuardrails.text, /resolve_preset/);
  assert.match(workflowGuardrails.text, /default seed/i);
  assert.match(workflowGuardrails.text, /4096/);
});

test("discovery: listWorkflowPrompts returns the fixed prompt catalog", () => {
  const prompts = listWorkflowPrompts();

  assert.equal(prompts.length, 2);
  assert.deepEqual(
    prompts.map((prompt) => prompt.name),
    ["recommended_preset_workflow", "recommended_recipe_workflow"]
  );
  assert.equal(prompts.every((prompt) => typeof prompt.description === "string" && prompt.description.length > 0), true);
});

test("discovery: getWorkflowPrompt returns text guidance and rejects arguments", () => {
  const presetPrompt = getWorkflowPrompt("recommended_preset_workflow");
  const recipePrompt = getWorkflowPrompt("recommended_recipe_workflow");

  assert.ok(presetPrompt);
  assert.ok(recipePrompt);
  assert.match(presetPrompt.text, /list_presets/);
  assert.match(presetPrompt.text, /resolve_preset/);
  assert.match(presetPrompt.text, /generate_texture/);
  assert.match(presetPrompt.text, /128/);
  assert.match(presetPrompt.text, /total layers/i);
  assert.match(recipePrompt.text, /validate_recipe/);
  assert.match(recipePrompt.text, /resolve_preset/);
  assert.match(recipePrompt.text, /applicationScope/);
  assert.match(recipePrompt.text, /128/);
  assert.match(recipePrompt.text, /total layers/i);
  assert.throws(
    () => getWorkflowPrompt("recommended_preset_workflow", { unexpected: "value" }),
    /does not accept arguments/i
  );
});

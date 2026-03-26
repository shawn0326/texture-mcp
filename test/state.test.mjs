import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const {
  createAppState,
  getWorkspaceInfo
} = await import(pathToFileURL(path.join(projectRoot, "dist", "mcp", "state.js")).href);

test("state: createAppState prefers explicit workspace roots over env and cwd", () => {
  const previousWorkspaceRoot = process.env.TEXTURE_MCP_WORKSPACE;
  process.env.TEXTURE_MCP_WORKSPACE = path.join(projectRoot, "env-root");

  try {
    const state = createAppState(path.join(projectRoot, "explicit-root"));
    const workspaceInfo = getWorkspaceInfo(state);

    assert.equal(workspaceInfo.workspaceRoot, path.join(projectRoot, "explicit-root"));
    assert.equal(workspaceInfo.workspaceRootSource, "explicit");
    assert.equal(workspaceInfo.cwd, projectRoot);
  } finally {
    if (previousWorkspaceRoot === undefined) {
      delete process.env.TEXTURE_MCP_WORKSPACE;
    } else {
      process.env.TEXTURE_MCP_WORKSPACE = previousWorkspaceRoot;
    }
  }
});

test("state: createAppState uses the environment workspace root before cwd", () => {
  const previousWorkspaceRoot = process.env.TEXTURE_MCP_WORKSPACE;
  process.env.TEXTURE_MCP_WORKSPACE = path.join(projectRoot, "env-root");

  try {
    const state = createAppState();
    const workspaceInfo = getWorkspaceInfo(state);

    assert.equal(workspaceInfo.workspaceRoot, path.join(projectRoot, "env-root"));
    assert.equal(workspaceInfo.workspaceRootSource, "env");
    assert.equal(workspaceInfo.cwd, projectRoot);
  } finally {
    if (previousWorkspaceRoot === undefined) {
      delete process.env.TEXTURE_MCP_WORKSPACE;
    } else {
      process.env.TEXTURE_MCP_WORKSPACE = previousWorkspaceRoot;
    }
  }
});

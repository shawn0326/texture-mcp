import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const entryFile = path.join(projectRoot, "dist", "mcp", "index.js");

test("smoke: compiled MCP entry completes a dry-run startup", () => {
  const result = spawnSync(process.execPath, [entryFile, "--smoke"], {
    cwd: projectRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /\[texture-mcp\] MCP server dry-run ready/);
});

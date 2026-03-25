#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { pathToFileURL } from "node:url";
import { createAppState } from "./state.js";
import { CompatibleStdioServerTransport } from "./stdio-transport.js";
import {
  createListToolsResult,
  createTextureToolDefinitions,
  executeTextureTool
} from "./tools.js";

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "texture-mcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        logging: {},
        tools: {
          listChanged: false
        }
      }
    }
  );

  const state = createAppState();
  const tools = createTextureToolDefinitions(state);

  server.setRequestHandler(ListToolsRequestSchema, async () => createListToolsResult(tools));
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    executeTextureTool(tools, request.params.name, request.params.arguments)
  );

  return server;
}

export async function startMcpServer(options?: { dryRun?: boolean }): Promise<void> {
  const server = createMcpServer();

  if (options?.dryRun) {
    console.error("[texture-mcp] MCP server dry-run ready");
    return;
  }

  const transport = new CompatibleStdioServerTransport();

  await server.connect(transport);
}

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryUrl && import.meta.url === entryUrl) {
  const dryRun = process.argv.includes("--smoke");

  void startMcpServer({ dryRun }).catch((error: unknown) => {
    console.error("[texture-mcp] Failed to start MCP server");
    console.error(error);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CallToolRequestSchema,
  ErrorCode,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getWorkflowPrompt, listReferenceResources, listWorkflowPrompts, readReferenceResource } from "./discovery.js";
import { createAppState } from "./state.js";
import { CompatibleStdioServerTransport } from "./stdio-transport.js";
import {
  createListToolsResult,
  createTextureToolDefinitions,
  executeTextureTool
} from "./tools.js";

function resolvePackageVersion(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const packageJsonPath = path.resolve(path.dirname(currentFilePath), "..", "..", "package.json");

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version?: unknown;
    };

    if (typeof packageJson.version === "string" && packageJson.version.length > 0) {
      return packageJson.version;
    }
  } catch {
    // Fall back to a readable placeholder if package metadata cannot be resolved.
  }

  return "0.0.0";
}

export const MCP_SERVER_VERSION = resolvePackageVersion();

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "texture-mcp",
      version: MCP_SERVER_VERSION
    },
    {
      capabilities: {
        logging: {},
        tools: {
          listChanged: false
        },
        resources: {
          subscribe: false,
          listChanged: false
        },
        prompts: {
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
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: listReferenceResources()
  }));
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: []
  }));
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resource = readReferenceResource(request.params.uri);

    if (!resource) {
      throw new McpError(ErrorCode.InvalidParams, `Resource ${request.params.uri} not found`);
    }

    return {
      contents: [
        {
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: resource.text
        }
      ]
    };
  });
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: listWorkflowPrompts()
  }));
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    try {
      const prompt = getWorkflowPrompt(request.params.name, request.params.arguments);

      if (!prompt) {
        throw new McpError(ErrorCode.InvalidParams, `Prompt ${request.params.name} not found`);
      }

      return {
        description: prompt.description,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: prompt.text
            }
          }
        ]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InvalidParams,
        error instanceof Error ? error.message : String(error)
      );
    }
  });

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

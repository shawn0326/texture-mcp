import type { Meta, Recipe } from "../core/types.js";

export type CurrentResult = {
  recipe: Recipe;
  imageBuffer: Buffer;
  meta: Meta;
};

export type AppState = {
  workspaceRoot: string;
  current: CurrentResult | null;
};

function resolveWorkspaceRoot(explicitWorkspaceRoot?: string): string {
  if (explicitWorkspaceRoot) {
    return explicitWorkspaceRoot;
  }

  const environmentWorkspaceRoot = process.env.TEXTURE_MCP_WORKSPACE?.trim();

  if (environmentWorkspaceRoot) {
    return environmentWorkspaceRoot;
  }

  return process.cwd();
}

export function createAppState(workspaceRoot?: string): AppState {
  return {
    workspaceRoot: resolveWorkspaceRoot(workspaceRoot),
    current: null
  };
}

export function getCurrentResult(state: AppState): CurrentResult | null {
  return state.current;
}

export function setCurrentResult(state: AppState, current: CurrentResult): void {
  state.current = current;
}

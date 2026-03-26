import path from "node:path";
import type {
  GetWorkspaceInfoOutput,
  Meta,
  Recipe,
  WorkspaceRootSource
} from "../core/types.js";

export type CurrentResult = {
  recipe: Recipe;
  imageBuffer: Buffer;
  meta: Meta;
};

export type AppState = {
  workspaceRoot: string;
  workspaceRootSource: WorkspaceRootSource;
  cwd: string;
  current: CurrentResult | null;
};

function resolveWorkspaceState(explicitWorkspaceRoot?: string): Pick<
  AppState,
  "workspaceRoot" | "workspaceRootSource" | "cwd"
> {
  const cwd = path.resolve(process.cwd());
  const trimmedExplicitWorkspaceRoot = explicitWorkspaceRoot?.trim();

  if (trimmedExplicitWorkspaceRoot) {
    return {
      workspaceRoot: path.resolve(trimmedExplicitWorkspaceRoot),
      workspaceRootSource: "explicit",
      cwd
    };
  }

  const environmentWorkspaceRoot = process.env.TEXTURE_MCP_WORKSPACE?.trim();

  if (environmentWorkspaceRoot) {
    return {
      workspaceRoot: path.resolve(environmentWorkspaceRoot),
      workspaceRootSource: "env",
      cwd
    };
  }

  return {
    workspaceRoot: cwd,
    workspaceRootSource: "cwd",
    cwd
  };
}

export function createAppState(workspaceRoot?: string): AppState {
  return {
    ...resolveWorkspaceState(workspaceRoot),
    current: null
  };
}

export function getCurrentResult(state: AppState): CurrentResult | null {
  return state.current;
}

export function setCurrentResult(state: AppState, current: CurrentResult): void {
  state.current = current;
}

export function getWorkspaceInfo(state: AppState): GetWorkspaceInfoOutput {
  return {
    workspaceRoot: state.workspaceRoot,
    workspaceRootSource: state.workspaceRootSource,
    cwd: state.cwd,
    exportPolicy: {
      requiresRelativeOutputPath: true,
      mustStayInsideWorkspaceRoot: true,
      blocksSymlinkOrJunctionEscape: true
    }
  };
}

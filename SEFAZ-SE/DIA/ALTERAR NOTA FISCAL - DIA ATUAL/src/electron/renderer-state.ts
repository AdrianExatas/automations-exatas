import type { RunResult } from "../runner";

export type RendererState = {
  lastResult?: RunResult;
  activeOutDir: string;
  activeExcelPath: string;
  activeProcessedCount: number;
  running: boolean;
};

export function createRendererState(): RendererState {
  return {
    activeOutDir: "",
    activeExcelPath: "",
    activeProcessedCount: 0,
    running: false,
  };
}

export function resetRendererState(state: RendererState): void {
  state.lastResult = undefined;
  state.activeOutDir = "";
  state.activeExcelPath = "";
  state.activeProcessedCount = 0;
}

import { EngineCamera } from "../engine-camera";
import { createEngineRunningState, type EngineRunningState } from "../running-state";

export class EngineEditor {
  #previewMode = false;

  public readonly runningState: EngineRunningState = createEngineRunningState();
  public readonly camera = new EngineCamera({
    isPaused: () => this.runningState.paused,
    isPreviewMode: () => this.#previewMode,
  });

  public setPreviewMode(previewMode: boolean): void {
    this.#previewMode = previewMode;
  }
}

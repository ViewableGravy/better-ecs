import { EngineCamera } from "../engine-camera";
import { createEngineRunningState, type EngineRunningState } from "../running-state";

type EngineEditorOptions = {
  onPause?: () => void;
};

export class EngineEditor {
  #previewMode = false;

  public readonly runningState: EngineRunningState;
  public readonly camera = new EngineCamera({
    isPaused: () => this.runningState.paused,
    isPreviewMode: () => this.#previewMode,
  });

  public constructor(options?: EngineEditorOptions) {
    this.runningState = createEngineRunningState({
      onPause: options?.onPause,
    });
  }

  public setPreviewMode(previewMode: boolean): void {
    this.#previewMode = previewMode;
  }
}

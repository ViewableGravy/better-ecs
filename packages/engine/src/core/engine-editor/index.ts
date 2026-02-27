import type { UserWorld } from "../../ecs/world";
import { EngineCamera } from "../engine-camera";
import { createEngineRunningState, type EngineRunningState } from "../running-state";

type EngineEditorHost = {
  scene: {
    world: UserWorld;
  };
  canvas: HTMLCanvasElement;
};

export class EngineEditor {
  #engine: EngineEditorHost;
  #previewMode = false;

  public readonly runningState: EngineRunningState;
  public readonly camera: EngineCamera;

  public constructor(engine: EngineEditorHost) {
    this.#engine = engine;

    this.runningState = createEngineRunningState({
      onPause: () => this.onPause(),
      onResume: () => this.onResume(),
    });

    this.camera = new EngineCamera({
      isPaused: () => this.runningState.paused,
      isPreviewMode: () => this.#previewMode,
      resolveWorld: () => this.#engine.scene.world,
      resolveViewportHeight: () => this.#engine.canvas.getBoundingClientRect().height,
    });
  }

  public setPreviewMode(previewMode: boolean): void {
    this.#previewMode = previewMode;
  }

  private onPause(): void {
    /***** CAMERA *****/
    this.camera.syncFromWorld();

    /***** TODO *****/
  }

  private onResume(): void {
    /***** CAMERA *****/
    // set the camera to the world camera mode

    /***** TODO *****/
  }
}

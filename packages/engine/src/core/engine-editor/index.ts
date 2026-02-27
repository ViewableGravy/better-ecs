import type { UserWorld } from "../../ecs/world";
import { EngineCamera } from "../engine-camera";
import type { EngineInput } from "../input";
import { createEngineRunningState, type EngineRunningState } from "../running-state";
import { GizmoInputManager } from "./gizmo-input-manager";
import { EngineEditorGizmoManager } from "./gizmo-manager";
import { EngineEditorSelectionManager } from "./selection-manager";

type EngineEditorHost = {
  scene: {
    world: UserWorld;
    context: {
      worldEntries: IterableIterator<[string, UserWorld]>;
      requireWorld: (id: string) => UserWorld;
    };
    activeWorldId: string;
  };
  canvas: HTMLCanvasElement;
  input: EngineInput;
};

export class EngineEditor {
  #engine: EngineEditorHost;
  #previewMode = false;

  public readonly runningState: EngineRunningState;
  public readonly camera: EngineCamera;
  public readonly gizmo: EngineEditorGizmoManager;
  public readonly selection: EngineEditorSelectionManager;
  public readonly gizmoInput: GizmoInputManager;

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

    this.gizmo = new EngineEditorGizmoManager({
      getSceneContext: () => this.#engine.scene.context,
      getActiveWorldId: () => this.#engine.scene.activeWorldId,
    });

    this.selection = new EngineEditorSelectionManager({
      getWorld: () => this.#engine.scene.world,
    });

    this.gizmoInput = new GizmoInputManager({
      input: this.#engine.input,
      getWorld: () => this.#engine.scene.world,
      camera: this.camera,
      gizmo: this.gizmo,
    });
  }

  public get running(): EngineRunningState {
    return this.runningState;
  }

  public setPreviewMode(previewMode: boolean): void {
    this.#previewMode = previewMode;
  }

  private onPause(): void {
    /***** CAMERA *****/
    this.camera.syncFromWorld();

    /***** INPUT *****/
    this.gizmoInput.listen();
  }

  private onResume(): void {
    /***** CAMERA *****/
    this.camera.syncFromWorld();

    /***** INPUT *****/
    this.gizmoInput.unlisten();

    /***** GIZMO *****/
    this.gizmo.clear();
  }
}

import { EngineCamera } from "@engine/core/engine-camera";
import { GizmoInputManager } from "@engine/core/engine-editor/gizmo-input-manager";
import { EngineEditorGizmoManager } from "@engine/core/engine-editor/gizmo-manager";
import { EngineEditorSelectionManager } from "@engine/core/engine-editor/selection-manager";
import type { EngineRenderCullingSettings } from "@engine/core/engine/render-culling";
import type { EngineInput, EngineKeyboardEvent } from "@engine/core/input";
import { createEngineRunningState, type EngineRunningState } from "@engine/core/running-state";
import type { SerializedWorld, UserWorld } from "@engine/ecs/world";
import { proxy } from "valtio";

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
  renderCulling: EngineRenderCullingSettings;
};

export class EngineEditor {
  #engine: EngineEditorHost;
  #previewMode = false;

  public readonly runningState: EngineRunningState;
  public readonly viewState = proxy({
    showQuadOutlines: false,
    showCullingBounds: false,
  });
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
      gizmo: this.gizmo,
    });

    this.viewState.showCullingBounds = this.#engine.renderCulling.debugOutline;

    if (typeof window !== "undefined") {
      this.#engine.input.addEventListener({
        event: { code: "KeyM", modifiers: { ctrl: true, shift: true } },
        callback: (event: EngineKeyboardEvent) => {
          event.preventDefault();
          this.toggleQuadOutlines();
        },
      });
    }
  }

  public get running(): EngineRunningState {
    return this.runningState;
  }

  public setPreviewMode(previewMode: boolean): void {
    this.#previewMode = previewMode;
  }

  public setQuadOutlines(showQuadOutlines: boolean): void {
    this.viewState.showQuadOutlines = showQuadOutlines;
  }

  public toggleQuadOutlines(): boolean {
    this.viewState.showQuadOutlines = !this.viewState.showQuadOutlines;
    return this.viewState.showQuadOutlines;
  }

  public setCullingBoundsVisible(showCullingBounds: boolean): void {
    this.viewState.showCullingBounds = showCullingBounds;
    this.#engine.renderCulling.debugOutline = showCullingBounds;
  }

  public toggleCullingBoundsVisible(): boolean {
    const next = !this.viewState.showCullingBounds;
    this.viewState.showCullingBounds = next;
    this.#engine.renderCulling.debugOutline = next;
    return next;
  }

  public serializeWorld(): SerializedWorld {
    return this.#engine.scene.world.serialize();
  }

  public stringifyWorld(space: number = 2): string {
    return JSON.stringify(this.serializeWorld(), null, space);
  }

  public downloadWorldSnapshot(filename: string = this.createWorldSnapshotFilename()): void {
    if (typeof document === "undefined" || typeof URL === "undefined") {
      throw new Error("World snapshot download requires browser document and URL APIs");
    }

    const snapshot = this.stringifyWorld();
    const blob = new Blob([snapshot], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(objectUrl);
  }

  private createWorldSnapshotFilename(): string {
    const worldId = this.#engine.scene.activeWorldId.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    return `${worldId || "world"}-${timestamp}.json`;
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

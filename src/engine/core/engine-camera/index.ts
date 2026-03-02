import { Camera, Transform2D } from "@engine/components";
import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";

export type EngineCameraMode = "world" | "engine";

type EngineCameraOptions = {
  isPaused: () => boolean;
  isPreviewMode: () => boolean;
  resolveWorld: () => UserWorld;
  resolveViewportHeight: () => number;
};

export class EngineCamera {
  public x = 0;
  public y = 0;
  public zoom = 1;

  readonly #isPaused: () => boolean;
  readonly #isPreviewMode: () => boolean;
  readonly #resolveWorld: () => UserWorld;
  readonly #resolveViewportHeight: () => number;

  constructor(options: EngineCameraOptions) {
    this.#isPaused = options.isPaused;
    this.#isPreviewMode = options.isPreviewMode;
    this.#resolveWorld = options.resolveWorld;
    this.#resolveViewportHeight = options.resolveViewportHeight;
  }

  public get mode(): EngineCameraMode {
    return this.#isPaused() && !this.#isPreviewMode() ? "engine" : "world";
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public setZoom(zoom: number): void {
    this.zoom = zoom > 0 ? zoom : 1;
  }

  public setView(x: number, y: number, zoom: number): void {
    this.x = x;
    this.y = y;
    this.zoom = zoom > 0 ? zoom : 1;
  }

  public syncFromWorld(): void {
    if (this.mode !== "engine") {
      return;
    }

    const world = this.#resolveWorld();
    let fallbackCameraEntityId: EntityId | null = null;

    for (const cameraEntityId of world.query(Camera, Transform2D)) {
      const camera = world.get(cameraEntityId, Camera);
      const transform = world.get(cameraEntityId, Transform2D);

      if (!camera || !camera.enabled || !transform) {
        continue;
      }

      if (!camera.primary && fallbackCameraEntityId === null) {
        fallbackCameraEntityId = cameraEntityId;
        continue;
      }

      if (!camera.primary) {
        continue;
      }

      this.setView(
        transform.curr.pos.x,
        transform.curr.pos.y,
        this.resolveZoom(camera.orthoSize),
      );
      return;
    }

    if (fallbackCameraEntityId !== null) {
      const fallbackCamera = world.get(fallbackCameraEntityId, Camera);
      const fallbackTransform = world.get(fallbackCameraEntityId, Transform2D);

      if (fallbackCamera && fallbackTransform) {
        this.setView(
          fallbackTransform.curr.pos.x,
          fallbackTransform.curr.pos.y,
          this.resolveZoom(fallbackCamera.orthoSize),
        );
        return;
      }
    }

    this.setView(0, 0, 1);
  }

  private resolveZoom(orthoSize: number): number {
    const viewportHeight = this.#resolveViewportHeight();
    return orthoSize > 0 ? viewportHeight / (orthoSize * 2) : 1;
  }
}

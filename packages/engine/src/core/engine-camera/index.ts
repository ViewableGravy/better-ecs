export type EngineCameraMode = "world" | "engine";

type EngineCameraOptions = {
  isPaused: () => boolean;
  isPreviewMode: () => boolean;
};

export class EngineCamera {
  public x = 0;
  public y = 0;
  public zoom = 1;

  readonly #isPaused: () => boolean;
  readonly #isPreviewMode: () => boolean;

  constructor(options: EngineCameraOptions) {
    this.#isPaused = options.isPaused;
    this.#isPreviewMode = options.isPreviewMode;
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
}

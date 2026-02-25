import type { CanvasReadyResolver } from "./types";

export class CanvasManager {
  #canvas: HTMLCanvasElement | null;
  #isCanvasReady: boolean;
  #awaitCanvasBeforeStart: boolean;
  #canvasReadyPromise: Promise<void>;
  #resolveCanvasReady: CanvasReadyResolver | null = null;

  public constructor(canvas: HTMLCanvasElement | null, awaitCanvasBeforeStart: boolean) {
    this.#canvas = canvas;
    this.#isCanvasReady = canvas !== null;
    this.#awaitCanvasBeforeStart = awaitCanvasBeforeStart;

    this.#canvasReadyPromise = new Promise<void>((resolve) => {
      this.#resolveCanvasReady = resolve;
    });

    if (this.#isCanvasReady) {
      this.#resolveCanvasReady?.();
      this.#resolveCanvasReady = null;
    }
  }

  public getCanvas(): HTMLCanvasElement {
    if (this.#canvas !== null) {
      return this.#canvas;
    }

    throw new Error("Engine canvas is not ready yet. Call startEngine() after canvas registration.");
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.#canvas = canvas;
    this.#isCanvasReady = true;

    this.#resolveCanvasReady?.();
    this.#resolveCanvasReady = null;
  }

  public removeCanvas(canvas: HTMLCanvasElement): void {
    if (this.#canvas !== canvas) {
      return;
    }

    this.#canvas = null;
    this.#isCanvasReady = false;
  }

  public async waitForCanvasReady(): Promise<void> {
    if (!this.#awaitCanvasBeforeStart) {
      return;
    }

    if (this.#isCanvasReady) {
      return;
    }

    await this.#canvasReadyPromise;
  }
}

export type { CanvasReadyResolver } from "./types";

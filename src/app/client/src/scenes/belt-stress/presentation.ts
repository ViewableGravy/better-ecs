import { BELT_STRESS_UPS } from "@client/scenes/belt-stress/config";
import {
  BeltStressRenderer,
  type BeltStressRendererConfiguration,
  type BeltStressRendererMetrics,
} from "@client/scenes/belt-stress/render/BeltStressRenderer";
import type { Renderer } from "@engine/render";

type PendingSnapshot = {
  readonly positions: Float32Array;
  readonly tick: number;
  readonly receivedAt: number;
  readonly release: () => void;
};

export type BeltStressPresentationMetrics = BeltStressRendererMetrics & {
  readonly renderedTick: number;
  readonly frameIntervalMs: number;
};

class BeltStressPresentation {
  #renderer: BeltStressRenderer | undefined;
  #pendingSnapshot: PendingSnapshot | undefined;
  #renderedTick = 0;
  #snapshotReceivedAt = 0;
  #lastDrawAt = 0;
  #frameIntervalMs = 0;

  public initialize(canvas: HTMLCanvasElement): void {
    this.#renderer ??= new BeltStressRenderer(canvas);
  }

  public configure(configuration: BeltStressRendererConfiguration): void {
    this.#requireRenderer().configure(configuration);
  }

  public publish(snapshot: PendingSnapshot): void {
    this.#pendingSnapshot?.release();
    this.#pendingSnapshot = snapshot;
  }

  public draw(renderer: Renderer): void {
    const drawAt = performance.now();
    if (this.#lastDrawAt > 0) {
      const interval = drawAt - this.#lastDrawAt;
      this.#frameIntervalMs = this.#frameIntervalMs === 0
        ? interval
        : this.#frameIntervalMs * 0.9 + interval * 0.1;
    }
    this.#lastDrawAt = drawAt;

    const stressRenderer = this.#requireRenderer();
    const pendingSnapshot = this.#pendingSnapshot;
    if (pendingSnapshot) {
      stressRenderer.uploadPositions(pendingSnapshot.positions);
      this.#renderedTick = pendingSnapshot.tick;
      this.#snapshotReceivedAt = pendingSnapshot.receivedAt;
      pendingSnapshot.release();
      this.#pendingSnapshot = undefined;
    }

    const interpolationAlpha = Math.min(
      1,
      (performance.now() - this.#snapshotReceivedAt) / (1000 / BELT_STRESS_UPS),
    );
    stressRenderer.draw({
      x: renderer.getCameraX(),
      y: renderer.getCameraY(),
      zoom: renderer.getCameraZoom(),
      viewportWidth: renderer.getWidth(),
      viewportHeight: renderer.getHeight(),
    }, interpolationAlpha, this.#renderedTick);
  }

  public clear(): void {
    this.#pendingSnapshot?.release();
    this.#pendingSnapshot = undefined;
    this.#renderedTick = 0;
    this.#snapshotReceivedAt = 0;
    this.#lastDrawAt = 0;
    this.#frameIntervalMs = 0;
    this.#renderer?.clear();
  }

  public metrics(): BeltStressPresentationMetrics {
    return {
      ...this.#requireRenderer().metrics(),
      renderedTick: this.#renderedTick,
      frameIntervalMs: this.#frameIntervalMs,
    };
  }

  #requireRenderer(): BeltStressRenderer {
    if (!this.#renderer) {
      throw new Error("Belt stress presentation has not been initialized.");
    }

    return this.#renderer;
  }
}

export const beltStressPresentation = new BeltStressPresentation();

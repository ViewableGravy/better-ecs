/**
 * Controller managing the conveyor simulation worker lifecycle and rendering.
 */

import type { ConveyorRequest, ConveyorResponse, SimCommand } from "@client/scenes/conveyor-worker/protocol";
import type { BeltVariant } from "@client/scenes/conveyor-worker/types";
import type { ConveyorItemTypeConfig } from "@client/scenes/conveyor-worker/renderer";
import { ConveyorItemRenderer } from "@client/scenes/conveyor-worker/renderer";
import type { Renderer } from "@engine/render";
import ConveyorSimulationWorker from "@client/scenes/conveyor-worker/simulation.worker?worker";

const UPS = 30;

export class ConveyorController {
  private readonly worker = new ConveyorSimulationWorker();
  private readonly renderer: ConveyorItemRenderer;
  private tick = 0;
  private lastSnapshotTime = 0;
  private currentSnapshot: Float32Array | null = null;
  private currentItemCount = 0;
  private ready = false;

  get isReady(): boolean {
    return this.ready;
  }

  constructor(itemType: ConveyorItemTypeConfig) {
    this.renderer = new ConveyorItemRenderer(itemType);

    this.worker.onmessage = (event: MessageEvent<ConveyorResponse>) => {
      this.receive(event.data);
    };
  }

  /** Initialize the worker with a belt layout. */
  init(layout: ReadonlyArray<{ x: number; y: number; variant?: BeltVariant }>): void {
    this.post({ type: "init", layout });
  }

  /** Send simulation commands. */
  sendCommands(commands: readonly SimCommand[]): void {
    this.post({ type: "commands", commands: [...commands] });
  }

  /** Initialize GPU resources via the engine renderer. Called once per scene setup. */
  initializeRenderer(renderer: Renderer): void {
    this.renderer.initialize(renderer);
  }

  /** Draw all conveyor items. Called from a render pass each frame. */
  draw(renderer: Renderer): void {
    if (!this.ready || !this.renderer.isReady) {
      return;
    }

    const snapshot = this.currentSnapshot;
    if (snapshot && this.currentItemCount > 0) {
      this.renderer.publishSnapshot(snapshot, this.currentItemCount);
      this.currentSnapshot = null;
    }

    const interpolationAlpha = Math.min(
      1,
      (performance.now() - this.lastSnapshotTime) / (1000 / UPS),
    );

    this.renderer.draw(renderer, interpolationAlpha);
  }

  dispose(): void {
    this.renderer.release();
    this.worker.terminate();
  }

  private receive(msg: ConveyorResponse): void {
    if (msg.type === "inited") {
      this.ready = true;
      return;
    }

    if (msg.type === "snapshot") {
      this.currentSnapshot = msg.positions;
      this.currentItemCount = msg.itemCount;
      this.tick = msg.tick;
      this.lastSnapshotTime = performance.now();
    }
  }

  private post(msg: ConveyorRequest, transfer: Transferable[] = []): void {
    this.worker.postMessage(msg, transfer);
  }
}

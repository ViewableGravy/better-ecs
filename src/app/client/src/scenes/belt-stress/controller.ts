import {
  BELT_STRESS_BELT_SIZE,
  BELT_STRESS_COLUMNS,
  BELT_STRESS_ITEMS_PER_BELT,
  BELT_STRESS_TICKS_PER_BELT,
  BELT_STRESS_TRANSFER_BUFFER_COUNT,
  BELT_STRESS_UPS,
  type BeltStressItemCount,
  requireBeltStressItemCount,
} from "@client/scenes/belt-stress/config";
import { beltStressPresentation } from "@client/scenes/belt-stress/presentation";
import type {
  BeltStressConfigured,
  BeltStressSimulationRequest,
  BeltStressSimulationResponse,
  BeltStressSnapshot,
} from "@client/scenes/belt-stress/protocol";
import type { BeltStressRendererConfiguration } from "@client/scenes/belt-stress/render/BeltStressRenderer";
import BeltStressSimulationWorker from "@client/scenes/belt-stress/simulation.worker?worker";
import type { BeltStressStatus } from "@client/scenes/belt-stress/types";

type VisualConfiguration = Omit<
  BeltStressRendererConfiguration,
  "beltPositions" | "itemCount"
>;
type StatusListener = (status: BeltStressStatus) => void;

export class BeltStressController {
  readonly #worker = new BeltStressSimulationWorker();
  readonly #visuals: VisualConfiguration;
  #itemCount: BeltStressItemCount;
  #beltCount = 0;
  #workerTick = 0;
  #simulationTimeMs = 0;
  #skippedPublications = 0;
  #checksum = 0;
  #configurationId = 0;
  #statusListener: StatusListener = () => undefined;

  public constructor(itemCount: BeltStressItemCount, visuals: VisualConfiguration) {
    this.#itemCount = itemCount;
    this.#visuals = visuals;
    this.#worker.onmessage = (event: MessageEvent<BeltStressSimulationResponse>) => {
      this.#receive(event.data);
    };
  }

  public configure(value: number): void {
    this.#itemCount = requireBeltStressItemCount(value);
    this.#configurationId += 1;
    this.#beltCount = 0;
    this.#workerTick = 0;
    this.#post({
      type: "configure",
      configurationId: this.#configurationId,
      itemCount: this.#itemCount,
      updatesPerSecond: BELT_STRESS_UPS,
      columns: BELT_STRESS_COLUMNS,
      itemsPerBelt: BELT_STRESS_ITEMS_PER_BELT,
      beltSize: BELT_STRESS_BELT_SIZE,
      ticksPerBelt: BELT_STRESS_TICKS_PER_BELT,
      transferBufferCount: BELT_STRESS_TRANSFER_BUFFER_COUNT,
    });
    this.#emitStatus();
  }

  public setStatusListener(listener: StatusListener): void {
    this.#statusListener = listener;
    this.#emitStatus();
  }

  public status(): BeltStressStatus {
    return {
      itemCount: this.#itemCount,
      beltCount: this.#beltCount,
      workerTick: this.#workerTick,
      simulationTimeMs: this.#simulationTimeMs,
      skippedPublications: this.#skippedPublications,
      checksum: this.#checksum,
      render: beltStressPresentation.metrics(),
    };
  }

  public dispose(): void {
    this.#post({ type: "dispose" });
    this.#worker.terminate();
    beltStressPresentation.clear();
  }

  #receive(message: BeltStressSimulationResponse): void {
    if (message.configurationId !== this.#configurationId) {
      if (message.type === "snapshot") {
        this.#post({
          type: "return-buffer",
          configurationId: message.configurationId,
          buffer: message.positions,
        }, [message.positions]);
      }
      return;
    }

    if (message.type === "configured") {
      this.#configurePresentation(message);
      return;
    }

    this.#publishSnapshot(message);
  }

  #configurePresentation(message: BeltStressConfigured): void {
    this.#beltCount = message.beltCount;
    beltStressPresentation.configure({
      ...this.#visuals,
      beltPositions: new Float32Array(message.beltPositions),
      itemCount: message.itemCount,
    });
    this.#emitStatus();
  }

  #publishSnapshot(message: BeltStressSnapshot): void {
    this.#workerTick = message.tick;
    this.#simulationTimeMs = message.simulationTimeMs;
    this.#skippedPublications = message.skippedPublications;
    this.#checksum = message.checksum;
    const positions = message.positions;
    beltStressPresentation.publish({
      positions: new Float32Array(positions),
      tick: message.tick,
      receivedAt: performance.now(),
      release: () => this.#post({
        type: "return-buffer",
        configurationId: message.configurationId,
        buffer: positions,
      }, [positions]),
    });
    this.#emitStatus();
  }

  #emitStatus(): void {
    this.#statusListener(this.status());
  }

  #post(message: BeltStressSimulationRequest, transfer: Transferable[] = []): void {
    this.#worker.postMessage(message, transfer);
  }
}

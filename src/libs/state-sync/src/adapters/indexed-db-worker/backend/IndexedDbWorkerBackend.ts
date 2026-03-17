import type { DiffCommand } from "@engine";
import type { SerializedSceneState } from "@libs/state-sync/scene-state";
import type { StateSyncBackend } from "@libs/state-sync/types";

import type {
    IndexedDbWorkerAdapterOptions,
    IndexedDbWorkerBackendEvent,
} from "@libs/state-sync/adapters/indexed-db-worker/types";

type IndexedDbWorkerListener<TType extends IndexedDbWorkerBackendEvent["type"]> = (
  event: Extract<IndexedDbWorkerBackendEvent, { type: TType }>,
) => void;

type ListenerMap = {
  [TType in IndexedDbWorkerBackendEvent["type"]]: Set<IndexedDbWorkerListener<TType>>;
};

type WorkerRequest =
  | { type: "load"; requestId: number }
  | { type: "seed"; state: SerializedSceneState }
  | { type: "emit-batch"; commands: DiffCommand[] };

type WorkerResponse =
  | {
      type: "loaded";
      requestId: number;
      state: SerializedSceneState | null;
      hasStoredState: boolean;
    }
  | {
      type: "flushed";
    }
  | {
      type: "error";
      error: unknown;
    };

const DEFAULT_FLUSH_INTERVAL_MS = 1000;

export class IndexedDbWorkerBackend
  implements StateSyncBackend<SerializedSceneState, DiffCommand, IndexedDbWorkerBackendEvent> {
  static #instance: IndexedDbWorkerBackend | null = null;

  readonly #listeners: ListenerMap = {
    loaded: new Set(),
    flushed: new Set(),
    error: new Set(),
  };
  readonly #worker: Worker;
  readonly #loadRequests = new Map<number, (state: SerializedSceneState | null) => void>();

  #requestId = 0;

  static instance(options: IndexedDbWorkerAdapterOptions): IndexedDbWorkerBackend {
    if (!this.#instance) {
      this.#instance = new IndexedDbWorkerBackend(options);
      return this.#instance;
    }

    this.#instance.assertCompatibleOptions(options);
    return this.#instance;
  }

  static resetForTests(): void {
    this.#instance?.dispose();
    this.#instance = null;
  }

  constructor(private readonly options: IndexedDbWorkerAdapterOptions) {
    this.#worker = new Worker(
      new URL("./IndexedDbWorker.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.#worker.addEventListener("message", this.handleMessage);
    this.#worker.postMessage({
      type: "configure",
      options: {
        databaseName: options.databaseName,
        storeName: options.storeName,
        storageKey: options.storageKey,
        flushIntervalMs: options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
      },
    });
  }

  async load(): Promise<SerializedSceneState | null> {
    const requestId = this.nextRequestId();

    const result = await new Promise<SerializedSceneState | null>((resolve) => {
      this.#loadRequests.set(requestId, resolve);
      this.postMessage({ type: "load", requestId });
    });

    this.emitEvent("loaded", { type: "loaded", hasStoredState: result !== null });
    return result;
  }

  seed(state: SerializedSceneState): void {
    this.postMessage({ type: "seed", state });
  }

  emit(command: DiffCommand): void {
    this.emitBatch([command]);
  }

  emitBatch(commands: readonly DiffCommand[]): void {
    if (commands.length === 0) {
      return;
    }

    this.postMessage({ type: "emit-batch", commands: [...commands] });
  }

  on<TType extends IndexedDbWorkerBackendEvent["type"]>(
    type: TType,
    listener: IndexedDbWorkerListener<TType>,
  ): () => void {
    const listeners = this.#listeners[type] as Set<IndexedDbWorkerListener<TType>>;
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  dispose(): void {
    this.#worker.removeEventListener("message", this.handleMessage);
    this.#worker.terminate();
    this.#loadRequests.clear();
  }

  private assertCompatibleOptions(options: IndexedDbWorkerAdapterOptions): void {
    if (options.databaseName !== this.options.databaseName
      || options.storeName !== this.options.storeName
      || options.storageKey !== this.options.storageKey) {
      throw new Error("IndexedDbWorkerBackend singleton received incompatible options");
    }
  }

  private readonly handleMessage = (event: MessageEvent<WorkerResponse>): void => {
    const message = event.data;

    if (message.type === "loaded") {
      const resolve = this.#loadRequests.get(message.requestId);
      if (resolve) {
        this.#loadRequests.delete(message.requestId);
        resolve(message.state);
      }
      return;
    }

    if (message.type === "flushed") {
      this.emitEvent("flushed", { type: "flushed" });
      return;
    }

    this.emitEvent("error", { type: "error", error: message.error });
  };

  private emitEvent<TType extends IndexedDbWorkerBackendEvent["type"]>(
    type: TType,
    event: Extract<IndexedDbWorkerBackendEvent, { type: TType }>,
  ): void {
    const listeners = this.#listeners[type] as Set<IndexedDbWorkerListener<TType>>;

    for (const listener of listeners) {
      listener(event);
    }
  }

  private nextRequestId(): number {
    this.#requestId += 1;
    return this.#requestId;
  }

  private postMessage(message: WorkerRequest): void {
    this.#worker.postMessage(message);
  }
}
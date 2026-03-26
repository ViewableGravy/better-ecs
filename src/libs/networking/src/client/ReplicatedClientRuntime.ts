import type { RegisteredEngine } from "@engine/core/engine-types";
import { applySceneStateToEngine } from "@libs/state-sync/scene-state/apply-to-engine";
import { createCommandMessage, parseServerMessage, serializeNetworkMessage, type ServerToClientMessage } from "@repo/networking/protocol";
import invariant from "tiny-invariant";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type NetworkClientTransport = {
  send: (message: string) => void;
  onMessage: (listener: (message: string) => void) => () => void;
};

export type ReplicatedClientStatus = {
  currentVersion: number;
  pendingMessages: number;
  lastAckedCommandId: string | null;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class ReplicatedClientRuntime {
  readonly #pendingMessages: ServerToClientMessage[] = [];

  #engine: RegisteredEngine | null = null;
  #transportCleanup: (() => void) | null = null;
  #transport: NetworkClientTransport | null = null;
  #currentVersion = 0;
  #lastAckedCommandId: string | null = null;

  public attachEngine(engine: RegisteredEngine): void {
    this.#engine = engine;
  }

  public bindTransport(transport: NetworkClientTransport): void {
    this.unbindTransport();
    this.#transport = transport;
    this.#transportCleanup = transport.onMessage((message) => {
      this.receiveMessage(message);
    });
  }

  public unbindTransport(): void {
    this.#transportCleanup?.();
    this.#transportCleanup = null;
    this.#transport = null;
  }

  public receiveMessage(rawMessage: string): void {
    const parsed = parseServerMessage(rawMessage);
    if (!parsed.ok) {
      throw new Error(parsed.error.message);
    }

    this.#pendingMessages.push(parsed.value);
  }

  public flush(): void {
    const engine = this.requireEngine();

    while (this.#pendingMessages.length > 0) {
      const message = this.#pendingMessages.shift();
      invariant(message, "Expected a queued server message.");

      switch (message.type) {
        case "snapshot":
          applySceneStateToEngine(engine.scene.context, engine.serialization, message.scene);
          this.#currentVersion = message.version;
          break;
        case "diff":
          engine.serialization.applyDiffCommands(message.commands);
          this.#currentVersion = message.version;
          break;
        case "ack":
          this.#currentVersion = message.version;
          this.#lastAckedCommandId = message.commandId;
          break;
        case "pong":
          break;
        case "error":
          throw new Error(`${message.code}: ${message.message}`);
      }
    }
  }

  public sendPing(timestamp: number = Date.now()): void {
    this.requireTransport().send(serializeNetworkMessage({
      type: "ping",
      timestamp,
    }));
  }

  public sendCommand<TPayload>(name: string, payload: TPayload, commandId?: string): string {
    const command = createCommandMessage(name, payload, commandId);
    this.requireTransport().send(serializeNetworkMessage(command));
    return command.id;
  }

  public status(): ReplicatedClientStatus {
    return {
      currentVersion: this.#currentVersion,
      pendingMessages: this.#pendingMessages.length,
      lastAckedCommandId: this.#lastAckedCommandId,
    };
  }

  private requireEngine(): RegisteredEngine {
    invariant(this.#engine, "Replicated client runtime has not been attached to an engine.");
    return this.#engine;
  }

  private requireTransport(): NetworkClientTransport {
    invariant(this.#transport, "Replicated client runtime has not been bound to a transport.");
    return this.#transport;
  }
}
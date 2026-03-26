import type { AnyEngine } from "@engine/core/engine-types";
import type { SceneContext } from "@engine/core/scene/scene-context";
import type { DiffCommand } from "@engine/serialization";
import { serializeSceneState } from "@libs/state-sync/scene-state/serialize/serialize";
import {
    parseClientMessage,
    type ClientCommandMessage,
    type ServerAckMessage,
    type ServerDiffMessage,
    type ServerErrorMessage,
    type ServerPongMessage,
    type ServerSnapshotMessage,
    type ServerToClientMessage,
} from "@repo/networking/protocol";
import invariant from "tiny-invariant";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type AuthoritativeCommandContext<TPayload = unknown> = {
  clientId: string;
  commandId: string;
  commandName: string;
  payload: TPayload;
  engine: AuthoritativeRuntimeEngine;
  scene: SceneContext;
};

export type AuthoritativeCommandHandler<TPayload = unknown> = (
  context: AuthoritativeCommandContext<TPayload>,
) => void | Promise<void>;

export type AuthoritativeCommandHandlers = Record<string, AuthoritativeCommandHandler>;

export type OutgoingNetworkDelivery =
  | {
      type: "broadcast";
      message: ServerToClientMessage;
    }
  | {
      type: "client";
      clientId: string;
      message: ServerToClientMessage;
    };

export type AuthoritativeRuntimeStatus = {
  connectedClients: number;
  currentVersion: number;
  sceneName: string | null;
  registeredCommandCount: number;
};

type AuthoritativeNetworkRuntimeOptions = {
  commandHandlers?: AuthoritativeCommandHandlers;
};

type AuthoritativeRuntimeEngine = Pick<AnyEngine, "scene" | "serialization">;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class AuthoritativeNetworkRuntime {
  readonly #commandHandlers: AuthoritativeCommandHandlers;
  readonly #clients = new Set<string>();
  readonly #outbox: OutgoingNetworkDelivery[] = [];

  #engine: AuthoritativeRuntimeEngine | null = null;

  public constructor(options?: AuthoritativeNetworkRuntimeOptions) {
    this.#commandHandlers = options?.commandHandlers ?? {};
  }

  public attachEngine(engine: AuthoritativeRuntimeEngine): void {
    this.#engine = engine;
  }

  public connectClient(clientId: string): void {
    this.#clients.add(clientId);
    this.#enqueueClient(clientId, this.createSnapshotMessage());
  }

  public disconnectClient(clientId: string): void {
    this.#clients.delete(clientId);
  }

  public createSnapshotMessage(): ServerSnapshotMessage {
    const engine = this.requireEngine();

    return {
      type: "snapshot",
      version: engine.serialization.currentVersion,
      scene: serializeSceneState(engine.scene.context),
    };
  }

  public async receiveClientMessage(clientId: string, rawMessage: string): Promise<void> {
    const parsed = parseClientMessage(rawMessage);

    if (!parsed.ok) {
      this.#enqueueClient(clientId, parsed.error);
      return;
    }

    if (parsed.value.type === "ping") {
      this.#enqueueClient(clientId, this.createPongMessage(parsed.value.timestamp));
      return;
    }

    await this.#applyCommand(clientId, parsed.value);
  }

  public publishDiffCommands(commands: readonly DiffCommand[]): void {
    if (commands.length === 0) {
      return;
    }

    this.#enqueueBroadcast({
      type: "diff",
      version: getLatestCommandVersion(commands),
      commands,
    });
  }

  public flushOutgoingMessages(): OutgoingNetworkDelivery[] {
    if (this.#outbox.length === 0) {
      return [];
    }

    const deliveries = [...this.#outbox];
    this.#outbox.length = 0;
    return deliveries;
  }

  public status(): AuthoritativeRuntimeStatus {
    return {
      connectedClients: this.#clients.size,
      currentVersion: this.#engine?.serialization.currentVersion ?? 0,
      sceneName: this.#engine?.scene.activeSceneName ?? null,
      registeredCommandCount: Object.keys(this.#commandHandlers).length,
    };
  }

  async #applyCommand(clientId: string, message: ClientCommandMessage): Promise<void> {
    const handler = this.#commandHandlers[message.name];
    if (!handler) {
      this.#enqueueClient(clientId, {
        type: "error",
        code: "unknown-command",
        message: `Unknown command "${message.name}".`,
      });
      return;
    }

    const engine = this.requireEngine();

    try {
      await handler({
        clientId,
        commandId: message.id,
        commandName: message.name,
        payload: message.payload,
        engine,
        scene: engine.scene.context,
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Command handler threw an unknown error.";
      this.#enqueueClient(clientId, {
        type: "error",
        code: "command-handler-failed",
        message: messageText,
      });
      return;
    }

    this.#enqueueClient(clientId, this.createAckMessage(message.id));
  }

  private createAckMessage(commandId: string): ServerAckMessage {
    return {
      type: "ack",
      commandId,
      version: this.requireEngine().serialization.currentVersion,
    };
  }

  private createPongMessage(timestamp?: number): ServerPongMessage {
    return {
      type: "pong",
      timestamp: timestamp ?? Date.now(),
    };
  }

  private requireEngine(): AuthoritativeRuntimeEngine {
    invariant(this.#engine, "Authoritative network runtime has not been attached to an engine.");
    return this.#engine;
  }

  #enqueueBroadcast(message: ServerDiffMessage | ServerErrorMessage): void {
    if (this.#clients.size === 0) {
      return;
    }

    this.#outbox.push({
      type: "broadcast",
      message,
    });
  }

  #enqueueClient(
    clientId: string,
    message: ServerSnapshotMessage | ServerAckMessage | ServerPongMessage | ServerErrorMessage,
  ): void {
    this.#outbox.push({
      type: "client",
      clientId,
      message,
    });
  }
}

function getLatestCommandVersion(commands: readonly DiffCommand[]): number {
  let latestVersion = 0;

  for (const command of commands) {
    if (command.version > latestVersion) {
      latestVersion = command.version;
    }
  }

  return latestVersion;
}
import type { OutgoingNetworkDelivery } from "@repo/networking";
import { serializeNetworkMessage } from "@repo/networking/protocol";
import {
    MULTIPLAYER_PATH,
    SERVER_HOST,
    SERVER_PORT,
    SERVER_UPDATE_DELTA_MS,
    SERVER_UPS,
} from "@server/runtime/const";
import { createAuthoritativeDemoEngine } from "@server/scenes/demo/scene";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type MultiplayerSocketData = {
  clientId: string;
};

type StatusPayload = {
  host: string;
  port: number;
  path: string;
  sceneName: string;
  updateRate: number;
  connectedClients: number;
  dirtyVersion: number;
  uptimeMs: number;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class MultiplayerServerRuntime {
  readonly #startedAt = Date.now();
  readonly #engine: Awaited<ReturnType<typeof createAuthoritativeDemoEngine>>["engine"];
  readonly #network: Awaited<ReturnType<typeof createAuthoritativeDemoEngine>>["runtime"];
  readonly #sockets = new Map<string, Bun.ServerWebSocket<MultiplayerSocketData>>();

  #httpServer: Bun.Server<MultiplayerSocketData> | null = null;
  #tickInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(engine: Awaited<ReturnType<typeof createAuthoritativeDemoEngine>>["engine"], network: Awaited<ReturnType<typeof createAuthoritativeDemoEngine>>["runtime"]) {
    this.#engine = engine;
    this.#network = network;
  }

  public static async create(): Promise<MultiplayerServerRuntime> {
    const { engine, runtime } = await createAuthoritativeDemoEngine();
    return new MultiplayerServerRuntime(engine, runtime);
  }

  public start(): Bun.Server<MultiplayerSocketData> {
    if (this.#httpServer !== null) {
      return this.#httpServer;
    }

    this.#tickInterval = setInterval(() => {
      this.#stepEngine();
    }, SERVER_UPDATE_DELTA_MS);

    this.#httpServer = Bun.serve<MultiplayerSocketData>({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      fetch: (request, server) => {
        const url = new URL(request.url);

        if (url.pathname === MULTIPLAYER_PATH) {
          const upgraded = server.upgrade(request, {
            data: {
              clientId: crypto.randomUUID(),
            },
          });

          if (upgraded) {
            return undefined;
          }

          return Response.json({
            error: "Expected websocket upgrade request.",
          }, { status: 426 });
        }

        if (url.pathname === "/health") {
          return Response.json(this.status());
        }

        if (url.pathname === "/snapshot") {
          return Response.json(this.#network.createSnapshotMessage());
        }

        return Response.json({
          name: "better-ecs authoritative server",
          websocket: MULTIPLAYER_PATH,
          health: "/health",
          snapshot: "/snapshot",
        });
      },
      websocket: {
        open: (socket) => {
          this.#sockets.set(socket.data.clientId, socket);
          this.#network.connectClient(socket.data.clientId);
          this.#flushOutgoingMessages();
        },
        message: (socket, rawMessage) => {
          void this.#handleSocketMessage(socket, rawMessage);
        },
        close: (socket) => {
          this.#network.disconnectClient(socket.data.clientId);
          this.#sockets.delete(socket.data.clientId);
        },
      },
    });

    return this.#httpServer;
  }

  public stop(): void {
    if (this.#tickInterval !== null) {
      clearInterval(this.#tickInterval);
      this.#tickInterval = null;
    }

    for (const socket of this.#sockets.values()) {
      socket.close();
    }

    this.#sockets.clear();
    this.#httpServer?.stop();
    this.#httpServer = null;
  }

  public status(): StatusPayload {
    return {
      host: SERVER_HOST,
      port: SERVER_PORT,
      path: MULTIPLAYER_PATH,
      sceneName: this.#engine.scene.activeSceneName ?? this.#engine.scene.context.name,
      updateRate: SERVER_UPS,
      connectedClients: this.#network.status().connectedClients,
      dirtyVersion: this.#engine.serialization.currentVersion,
      uptimeMs: Date.now() - this.#startedAt,
    };
  }

  async #handleSocketMessage(socket: Bun.ServerWebSocket<MultiplayerSocketData>, rawMessage: string | Buffer): Promise<void> {
    const message = typeof rawMessage === "string" ? rawMessage : rawMessage.toString();

    await this.#network.receiveClientMessage(socket.data.clientId, message);
    this.#flushOutgoingMessages();
  }

  #stepEngine(): void {
    this.#engine.stepUpdate({
      updateDelta: SERVER_UPDATE_DELTA_MS,
      frameDelta: SERVER_UPDATE_DELTA_MS,
      now: performance.now(),
    });

    this.#network.publishDiffCommands(this.#engine.serialization.drainDiffCommands());
    this.#flushOutgoingMessages();
  }

  #flushOutgoingMessages(): void {
    const deliveries = this.#network.flushOutgoingMessages();
    for (const delivery of deliveries) {
      this.#dispatchDelivery(delivery);
    }
  }

  #dispatchDelivery(delivery: OutgoingNetworkDelivery): void {
    const payload = serializeNetworkMessage(delivery.message);

    if (delivery.type === "broadcast") {
      for (const socket of this.#sockets.values()) {
        socket.send(payload);
      }
      return;
    }

    const socket = this.#sockets.get(delivery.clientId);
    socket?.send(payload);
  }
}
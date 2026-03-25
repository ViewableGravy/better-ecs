import {
    MULTIPLAYER_PATH,
    SERVER_HOST,
    SERVER_PORT,
    SERVER_UPDATE_DELTA_MS,
    SERVER_UPS,
} from "./const";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type MultiplayerSocketData = {
  clientId: string;
};

type BootstrapEntity = {
  id: string;
  kind: "bootstrap-root";
  position: {
    x: number;
    y: number;
  };
};

type BootstrapSnapshot = {
  sceneName: string;
  version: number;
  entities: readonly BootstrapEntity[];
};

type SnapshotMessage = {
  type: "snapshot";
  version: number;
  scene: BootstrapSnapshot;
};

type ServerErrorMessage = {
  type: "error";
  code: string;
  message: string;
};

type PongMessage = {
  type: "pong";
  timestamp: number;
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
  readonly #sockets = new Set<Bun.ServerWebSocket<MultiplayerSocketData>>();
  readonly #snapshot: BootstrapSnapshot = createBootstrapSnapshot();

  #httpServer: Bun.Server<MultiplayerSocketData> | null = null;
  #tickInterval: ReturnType<typeof setInterval> | null = null;

  public static async create(): Promise<MultiplayerServerRuntime> {
    return new MultiplayerServerRuntime();
  }

  public start(): Bun.Server<MultiplayerSocketData> {
    if (this.#httpServer !== null) {
      return this.#httpServer;
    }

    this.#tickInterval = setInterval(() => {
      this.#heartbeat();
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
          return Response.json(this.#createSnapshotMessage());
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
          this.#sockets.add(socket);
          socket.send(this.serializeMessage(this.#createSnapshotMessage()));
        },
        message: (socket, rawMessage) => {
          this.#handleSocketMessage(socket, rawMessage);
        },
        close: (socket) => {
          this.#sockets.delete(socket);
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

    for (const socket of this.#sockets) {
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
      sceneName: this.#snapshot.sceneName,
      updateRate: SERVER_UPS,
      connectedClients: this.#sockets.size,
      dirtyVersion: this.#snapshot.version,
      uptimeMs: Date.now() - this.#startedAt,
    };
  }

  #createSnapshotMessage(): SnapshotMessage {
    return {
      type: "snapshot",
      version: this.#snapshot.version,
      scene: this.#snapshot,
    };
  }

  #handleSocketMessage(socket: Bun.ServerWebSocket<MultiplayerSocketData>, rawMessage: string | Buffer): void {
    const message = typeof rawMessage === "string" ? rawMessage : rawMessage.toString();

    if (message === "ping") {
      socket.send(this.serializeMessage({
        type: "pong",
        timestamp: Date.now(),
      }));
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(message);
    } catch {
      socket.send(this.serializeMessage({
        type: "error",
        code: "invalid-json",
        message: "WebSocket messages must be valid JSON or the literal string \"ping\".",
      }));
      return;
    }

    if (typeof parsed === "object" && parsed !== null && "type" in parsed && parsed.type === "ping") {
      socket.send(this.serializeMessage({
        type: "pong",
        timestamp: Date.now(),
      }));
      return;
    }

    this.#broadcast({
      type: "error",
      code: "commands-not-wired",
      message: "Command ingestion has not been connected yet. This socket currently supports snapshot, bootstrap state, and ping traffic only.",
    });
  }

  #broadcast(message: ServerErrorMessage | PongMessage): void {
    const serialized = this.serializeMessage(message);

    for (const socket of this.#sockets) {
      socket.send(serialized);
    }
  }

  #heartbeat(): void {
    if (this.#sockets.size === 0) {
      return;
    }
  }

  private serializeMessage(message: SnapshotMessage | ServerErrorMessage | PongMessage): string {
    return JSON.stringify(message);
  }
}

function createBootstrapSnapshot(): BootstrapSnapshot {
  return {
    sceneName: "AuthoritativeWorldBootstrap",
    version: 0,
    entities: [
      {
        id: "bootstrap-root",
        kind: "bootstrap-root",
        position: {
          x: -320,
          y: 0,
        },
      },
    ],
  };
}
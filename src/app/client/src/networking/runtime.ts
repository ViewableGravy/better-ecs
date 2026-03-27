import { ReplicatedClientRuntime } from "@repo/networking/client/ReplicatedClientRuntime";

const MULTIPLAYER_PATH = "/multiplayer";

type MultiplayerClientStatus = ReturnType<typeof multiplayerRuntime.status> & {
  connected: boolean;
  lastError: string | null;
};

const multiplayerRuntime = new ReplicatedClientRuntime();

let socket: WebSocket | null = null;
let connected = false;
let lastError: string | null = null;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function bindAuthoritativeMultiplayer(): void {
  if (socket !== null) {
    return;
  }

  socket = new WebSocket(resolveMultiplayerUrl());

  multiplayerRuntime.bindTransport({
    send(message) {
      if (socket?.readyState !== WebSocket.OPEN) {
        return;
      }

      socket.send(message);
    },
    onMessage(listener) {
      const messageHandler = (event: MessageEvent<string>) => {
        listener(event.data);
      };

      socket?.addEventListener("message", messageHandler);

      return () => {
        socket?.removeEventListener("message", messageHandler);
      };
    },
  });

  socket.addEventListener("open", () => {
    connected = true;
    lastError = null;
  });

  socket.addEventListener("close", () => {
    connected = false;
  });

  socket.addEventListener("error", () => {
    connected = false;
    lastError = "websocket-error";
  });
}

export function sendAuthoritativeCommand<TPayload>(name: string, payload: TPayload): string | null {
  if (!connected) {
    return null;
  }

  return multiplayerRuntime.sendCommand(name, payload);
}

export function multiplayerClientStatus(): MultiplayerClientStatus {
  return {
    ...multiplayerRuntime.status(),
    connected,
    lastError,
  };
}

export { multiplayerRuntime };

function resolveMultiplayerUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${MULTIPLAYER_PATH}`;
}
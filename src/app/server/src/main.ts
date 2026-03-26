import invariant from "tiny-invariant";

import { MultiplayerServerRuntime } from "@server/runtime/MultiplayerServerRuntime";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export async function main(): Promise<void> {
  const runtime = await MultiplayerServerRuntime.create();
  const server = runtime.start();

  console.log(`Authoritative server listening on http://${server.hostname}:${server.port}`);

  const shutdown = () => {
    runtime.stop();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  invariant(server, "Expected Bun server to start successfully.");
}

void main();

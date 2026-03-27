import { multiplayerRuntime } from "@client/networking/runtime";
import { createReplicatedNetworkingSystem } from "@repo/networking/client/system";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createReplicatedNetworkingSystem({
  runtime: multiplayerRuntime,
  name: "main:replicated-networking",
});
import { spawnCamera } from "@client/entities/camera";
import { createDomLoadingOverlay } from "@client/overlays/create-dom-loading-overlay";
import { System as LocalPlayerMovementIntent } from "@client/systems/core/local-player-movement-intent";
import { System as NetworkedLocalCamera } from "@client/systems/core/networked-local-camera";
import { System as NetworkedLocalPlayerMovementCommand } from "@client/systems/core/networked-local-player-movement-command";
import { System as ReplicatedNetworking } from "@client/systems/core/replicated-networking";
import { DebugOverlaySystem } from "@client/systems/world/debug-overlay";
import { fromContext, FromEngine } from "@engine/context";
import { contextId, createContextScene, defineContext } from "@libs/spatial-contexts";

const DEFAULT_CONTEXT_ID = contextId("default");

export const Scene = createContextScene("AuthoritativeNetworkingScene")({
  loading: createDomLoadingOverlay({
    id: "scene-loading-overlay-authoritative-networking",
    message: "Loading Authoritative Networking Scene...",
    zIndex: 10001,
    scope: "canvas-parent",
  }),
  systems: [
    ReplicatedNetworking,
    NetworkedLocalCamera,
    LocalPlayerMovementIntent,
    NetworkedLocalPlayerMovementCommand,
    DebugOverlaySystem,
  ],
  contexts: [
    defineContext({
      id: DEFAULT_CONTEXT_ID,
      policy: {
        visibility: "stack",
        simulation: "focused-only",
      },
      setup(world) {
        spawnCamera(world);
      },
    }),
  ],
  async setup(_world, manager) {
    manager.setFocusedContextId(DEFAULT_CONTEXT_ID);

    const assets = fromContext(FromEngine.Assets);

    await assets.loadSheet("player-idle");
    await assets.loadSheet("player-moving");
  },
});
import { createDomLoadingOverlay } from "@client/overlays/create-dom-loading-overlay";
import type { EngineOverlay } from "@engine";

export function createAppEngineLoadingOverlay(): EngineOverlay {
  return createDomLoadingOverlay({
    id: "engine-loading-overlay",
    message: "Initializing engine...",
    zIndex: 10000,
  });
}

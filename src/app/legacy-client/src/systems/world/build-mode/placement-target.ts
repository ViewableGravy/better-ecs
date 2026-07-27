import type { RegisteredEngine, Registry } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type PlacementTargetResolution = {
  inputWorld: Registry;
  focusedWorld: Registry;
  previewWorld: Registry;
  commitWorld: Registry;
  blocked: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function resolvePlacementWorld(
  engine: RegisteredEngine,
): PlacementTargetResolution {
  const registry = engine.scene.registry;

  return {
    inputWorld: registry,
    focusedWorld: registry,
    previewWorld: registry,
    commitWorld: registry,
    blocked: false,
  };
}

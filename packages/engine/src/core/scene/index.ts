// packages/engine/src/core/scene/index.ts
export { createScene } from "@core/scene/scene";
export { SceneContext } from "@core/scene/scene-context";
export { SceneManager } from "@core/scene/scene-manager";

// Export types but NOT the SCENE_BRAND symbol (internal use only)
export type {
  SceneConfig,
  SceneDefinition,
  SceneDefinitionTuple,
  SceneName,
  ScenesTupleToNames,
} from "@core/scene/scene.types";


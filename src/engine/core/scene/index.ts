// packages/engine/src/core/scene/index.ts
export { createScene } from "@engine/core/scene/scene";
export { SceneContext } from "@engine/core/scene/scene-context";
export { SceneManager } from "@engine/core/scene/scene-manager";

// Export types but NOT the SCENE_BRAND symbol (internal use only)
export type {
  SceneConfig,
  SceneDefinition,
  SceneDefinitionTuple,
  SceneName,
  ScenesTupleToNames,
} from "@engine/core/scene/scene.types";


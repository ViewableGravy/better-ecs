// packages/engine/src/core/scene/index.ts
export { createScene } from "./scene";
export { SceneManager } from "./scene-manager";

// Export types but NOT the SCENE_BRAND symbol (internal use only)
export type { 
  SceneConfig, 
  SceneDefinition, 
  SceneDefinitionTuple, 
  SceneName, 
  ScenesTupleToNames
} from "./scene.types";

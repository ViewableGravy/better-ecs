import type { SceneManager } from "../../../core/scene/scene-manager";
import type { SceneDefinitionTuple } from "../../../core/scene/scene.types";
import { useSubscribableSelector, type EqualityFn } from "./use-subscribable-selector";

export function useSceneSelector<TScenes extends SceneDefinitionTuple, TSelected>(
  scene: SceneManager<TScenes>,
  selector: (scene: SceneManager<TScenes>) => TSelected,
  equalityFn?: EqualityFn<TSelected>,
): TSelected {
  return useSubscribableSelector(scene, selector, equalityFn);
}
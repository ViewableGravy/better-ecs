import type { SceneContext } from "@engine/core/scene/scene-context";
import type { SerializedSceneState, SerializedSceneWorld } from "@libs/state-sync/scene-state/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function serializeSceneState(scene: SceneContext): SerializedSceneState {
  const worlds: SerializedSceneWorld[] = [];

  for (const [worldId, world] of scene.worldEntries) {
    worlds.push({
      worldId,
      world: world.serialize(),
    });
  }

  worlds.sort((left, right) => left.worldId.localeCompare(right.worldId));

  return {
    sceneName: scene.name,
    worlds,
  };
}
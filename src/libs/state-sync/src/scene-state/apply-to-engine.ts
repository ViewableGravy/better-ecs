import type { EngineSerializationManager, SceneContext } from "@engine";
import { createDiffCommandsForSceneStateDelta } from "@libs/state-sync/scene-state/diff/diff";
import { serializeSceneState } from "@libs/state-sync/scene-state/serialize/serialize";
import type { SerializedSceneState } from "@libs/state-sync/scene-state/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function applySceneStateToEngine(
  scene: SceneContext,
  serialization: EngineSerializationManager,
  target: SerializedSceneState,
): void {
  ensureDefaultWorldPresent(scene, target);
  reconcileSceneWorlds(scene, target);

  const current = serializeSceneState(scene);
  const commands = createDiffCommandsForSceneStateDelta(current, target);
  if (commands.length === 0) {
    return;
  }

  serialization.applyDiffCommands(commands);
}

function ensureDefaultWorldPresent(scene: SceneContext, target: SerializedSceneState): void {
  const hasDefaultWorld = target.worlds.some((world) => world.worldId === scene.defaultWorldId);
  if (!hasDefaultWorld) {
    throw new Error(`Serialized scene state for "${scene.name}" is missing the default world`);
  }
}

function reconcileSceneWorlds(scene: SceneContext, target: SerializedSceneState): void {
  const targetWorldIds = new Set(target.worlds.map((world) => world.worldId));

  for (const worldId of targetWorldIds) {
    if (worldId === scene.defaultWorldId || scene.hasWorld(worldId)) {
      continue;
    }

    scene.loadAdditionalWorld(worldId);
  }

  const existingWorldIds = Array.from(scene.worldEntries, ([worldId]) => worldId);
  for (const worldId of existingWorldIds) {
    if (worldId === scene.defaultWorldId || targetWorldIds.has(worldId)) {
      continue;
    }

    scene.unloadWorld(worldId);
  }
}
import { spawnCamera } from "@legacy/entities/camera";
import { ensurePlayer } from "@legacy/entities/player";
import type { Registry } from "@engine";
import { Parent, Transform2D } from "@engine/components";

export function setupContextCamera(world: Registry): void {
  spawnCamera(world);
}

export function setupContextPlayer(world: Registry, x: number, y: number): void {
  setupContextCamera(world);

  const playerId = ensurePlayer(world);

  world.patch(playerId, Transform2D, (playerTransform) => {
    playerTransform.curr.pos.set(x, y);
    playerTransform.prev.pos.set(x, y);
  });
}

/**
 * Creates a logical scene area under one transform root. The setup callback can
 * continue authoring entities in local coordinates while the Registry remains flat.
 */
export function setupSceneArea(
  registry: Registry,
  origin: { x: number; y: number },
  setup: (registry: Registry) => void,
): void {
  if (origin.x === 0 && origin.y === 0) {
    setup(registry);
    return;
  }

  const existingEntityIds = new Set(registry.all());
  const areaRoot = registry.create();
  registry.add(areaRoot, new Transform2D(origin.x, origin.y));

  setup(registry);

  for (const entityId of registry.all()) {
    if (entityId === areaRoot || existingEntityIds.has(entityId) || registry.has(entityId, Parent)) {
      continue;
    }

    registry.setParent(entityId, areaRoot);
  }
}

import { GhostPreviewComponent } from "@client/entities/ghost/component";
import type { EntityId, UserWorld } from "@engine";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class GhostPreviewScopeUtils {
  public static pruneGhosts(
    rootWorld: UserWorld,
    focusedWorld: UserWorld,
    sceneWorlds: Iterable<UserWorld>,
    ownerId: string,
  ): void {
    for (const sceneWorld of this.collectUniqueWorlds(rootWorld, sceneWorlds)) {
      if (sceneWorld === focusedWorld) {
        continue;
      }

      this.destroyOwnedGhosts(sceneWorld, ownerId);
    }
  }

  public static destroyOwnedGhosts(world: UserWorld, ownerId: string): void {
    for (const ghostEntityId of this.findOwnedGhostEntityIds(world, ownerId)) {
      world.destroy(ghostEntityId);
    }
  }

  public static destroyOwnedGhostsInWorlds(
    rootWorld: UserWorld,
    sceneWorlds: Iterable<UserWorld>,
    ownerId: string,
  ): void {
    for (const world of this.collectUniqueWorlds(rootWorld, sceneWorlds)) {
      this.destroyOwnedGhosts(world, ownerId);
    }
  }

  private static findOwnedGhostEntityIds(world: UserWorld, ownerId: string): EntityId[] {
    const ownedGhostEntityIds: EntityId[] = [];

    for (const ghostEntityId of world.query(GhostPreviewComponent)) {
      const ghostPreview = world.get(ghostEntityId, GhostPreviewComponent);

      if (!ghostPreview || ghostPreview.ownerId !== ownerId) {
        continue;
      }

      ownedGhostEntityIds.push(ghostEntityId);
    }

    return ownedGhostEntityIds;
  }

  private static collectUniqueWorlds(primaryWorld: UserWorld, worlds: Iterable<UserWorld>): UserWorld[] {
    const uniqueWorlds = new Set<UserWorld>([primaryWorld]);

    for (const world of worlds) {
      uniqueWorlds.add(world);
    }

    return [...uniqueWorlds];
  }
}
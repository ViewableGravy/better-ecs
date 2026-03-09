import { HALF_BOX_SIZE } from "@client/systems/world/build-mode/const";
import type { EntityId, UserWorld } from "@engine";
import { Transform2D } from "@engine/components";

import { GhostPreviewComponent } from "@client/entities/ghost/component";
import type { GhostPreset } from "@client/entities/ghost/spawner";
import { GhostUtils } from "@client/entities/ghost/utils";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class GhostPreviewManager {
  public static sync<TPayload>(
    world: UserWorld,
    ghostEntityId: EntityId | null,
    x: number,
    y: number,
    preset: GhostPreset<TPayload>,
    payload?: TPayload,
    isPlaceable: boolean = true,
  ): EntityId {
    if (!this.matchesGhostKind(world, ghostEntityId, preset.kind)) {
      this.destroyGhost(world, ghostEntityId);
      const nextGhostEntityId = preset.spawn(world, x, y, payload);
      GhostUtils.syncPlacementState(world, nextGhostEntityId, isPlaceable);

      return nextGhostEntityId;
    }

    this.syncPosition(world, ghostEntityId, x, y);
    preset.sync?.(world, ghostEntityId, payload);
    GhostUtils.syncPlacementState(world, ghostEntityId, isPlaceable);

    return ghostEntityId;
  }

  private static syncPosition(world: UserWorld, ghostEntityId: EntityId, x: number, y: number): void {
    const transform = world.require(ghostEntityId, Transform2D);

    transform.curr.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
    transform.prev.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
  }

  private static destroyGhost(world: UserWorld, ghostEntityId: EntityId | null): void {
    if (ghostEntityId === null || !world.all().includes(ghostEntityId)) {
      return;
    }

    world.destroy(ghostEntityId);
  }

  private static matchesGhostKind(
    world: UserWorld,
    ghostEntityId: EntityId | null,
    kind: string,
  ): ghostEntityId is EntityId {
    if (ghostEntityId === null || !world.has(ghostEntityId, GhostPreviewComponent)) {
      return false;
    }

    const ghostPreview = world.require(ghostEntityId, GhostPreviewComponent);

    return ghostPreview.kind === kind;
  }
}
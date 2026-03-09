import { GhostPreviewComponent, type GhostPreset } from "@client/entities/ghost";
import { HALF_BOX_SIZE } from "@client/systems/world/build-mode/const";
import type { EntityId, UserWorld } from "@engine";
import { Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class GhostPreviewManager {
  public static sync<TPayload, TGhostEntityId extends EntityId<any>>(
    world: UserWorld,
    ghostEntityId: TGhostEntityId | null,
    x: number,
    y: number,
    preset: GhostPreset<TPayload, TGhostEntityId>,
    payload?: TPayload,
  ): TGhostEntityId {
    if (!this.matchesGhostKind(world, ghostEntityId, preset.kind)) {
      this.destroyGhost(world, ghostEntityId);
      return preset.spawn(world, x, y, payload);
    }

    this.syncPosition(world, ghostEntityId, x, y);
    preset.sync?.(world, ghostEntityId, payload);

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
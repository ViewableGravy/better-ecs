import { HALF_BOX_SIZE } from "@legacy/systems/world/build-mode/metrics";
import type { EntityId, Registry } from "@engine";
import { Transform2D } from "@engine/components";

import { GhostPreviewComponent } from "@legacy/entities/ghost/component";
import type { GhostPreset } from "@legacy/entities/ghost/spawner";
import { GhostUtils } from "@legacy/entities/ghost/utils";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class GhostPreviewManager {
  public static sync<TPayload>(
    world: Registry,
    ghostEntityId: EntityId | null,
    x: number,
    y: number,
    preset: GhostPreset<TPayload>,
    payload?: TPayload,
    isPlaceable: boolean = true,
    ownerId: string = "local-player",
  ): EntityId {
    const previewVariant = preset.resolvePreviewVariant?.(payload) ?? null;

    if (!this.matchesGhost(world, ghostEntityId, preset.kind, ownerId)) {
      this.destroyGhost(world, ghostEntityId);
      const nextGhostEntityId = preset.spawn(world, x, y, payload);

      GhostUtils.applyEffect(world, nextGhostEntityId, preset.kind, ownerId, previewVariant);
      GhostUtils.syncPlacementState(world, nextGhostEntityId, isPlaceable);

      return nextGhostEntityId;
    }

    this.syncPosition(world, ghostEntityId, x, y);
    preset.sync?.(world, ghostEntityId, payload);
    this.syncPreviewVariant(world, ghostEntityId, previewVariant);
    GhostUtils.syncPlacementState(world, ghostEntityId, isPlaceable);

    return ghostEntityId;
  }

  private static syncPosition(world: Registry, ghostEntityId: EntityId, x: number, y: number): void {
    world.patch(ghostEntityId, Transform2D, (transform) => {
      transform.curr.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
      transform.prev.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
    });
  }

  private static destroyGhost(world: Registry, ghostEntityId: EntityId | null): void {
    if (ghostEntityId === null || !world.all().includes(ghostEntityId)) {
      return;
    }

    world.destroy(ghostEntityId);
  }

  private static syncPreviewVariant(
    world: Registry,
    ghostEntityId: EntityId,
    previewVariant: string | null,
  ): void {
    world.patch(ghostEntityId, GhostPreviewComponent, (ghostPreview) => {
      ghostPreview.previewVariant = previewVariant;
    });
  }

  private static matchesGhost(
    world: Registry,
    ghostEntityId: EntityId | null,
    kind: string,
    ownerId: string,
  ): ghostEntityId is EntityId {
    if (ghostEntityId === null || !world.has(ghostEntityId, GhostPreviewComponent)) {
      return false;
    }

    const ghostPreview = world.require(ghostEntityId, GhostPreviewComponent);

    return ghostPreview.kind === kind && ghostPreview.ownerId === ownerId;
  }
}

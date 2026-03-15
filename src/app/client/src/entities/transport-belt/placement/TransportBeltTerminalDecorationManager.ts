import { canConveyorStoreEntities, ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { OUTSIDE, RenderVisibility } from "@client/components/render-visibility";
import type { TransportBeltSide, TransportBeltVariant } from "@client/entities/transport-belt/consts";
import {
  getTransportBeltSideVector,
  getTransportBeltVariantDescriptor,
  TransportBeltGridQuery,
} from "@client/entities/transport-belt/core";
import {
  TransportBeltTerminalDecoration,
  type TransportBeltTerminalDecorationRole,
} from "@client/entities/transport-belt/placement/TransportBeltTerminalDecoration";
import { createTransportBeltSprite } from "@client/entities/transport-belt/render/createTransportBeltSprite";
import { GRID_CELL_SIZE } from "@client/systems/world/build-mode/const";
import type { EntityId, UserWorld } from "@engine";
import { AnimatedSprite, Debug, Parent, Transform2D } from "@engine/components";

export class TransportBeltTerminalDecorationManager {
  public static syncBelts(world: UserWorld, beltEntityIds: readonly (EntityId | null)[]): void {
    const visitedEntityIds = new Set<EntityId>();

    for (const beltEntityId of beltEntityIds) {
      if (beltEntityId === null || visitedEntityIds.has(beltEntityId)) {
        continue;
      }

      visitedEntityIds.add(beltEntityId);
      this.syncBelt(world, beltEntityId);
    }
  }

  public static syncBelt(world: UserWorld, beltEntityId: EntityId): void {
    const belt = world.get(beltEntityId, ConveyorBeltComponent);

    if (!belt || !canConveyorStoreEntities(belt.variant)) {
      this.destroyOwnedDecorations(world, beltEntityId);
      return;
    }

    const descriptor = getTransportBeltVariantDescriptor(belt.variant);

    if (!descriptor) {
      this.destroyOwnedDecorations(world, beltEntityId);
      return;
    }

    const [startSide, endSide] = descriptor.flow;

    this.syncTerminal(world, beltEntityId, "start", startSide, belt.previousEntityId === null);
    this.syncTerminal(world, beltEntityId, "end", endSide, belt.nextEntityId === null);
  }

  public static destroyOwnedDecorations(world: UserWorld, beltEntityId: EntityId): void {
    for (const decorationEntityId of this.findOwnedDecorationEntityIds(world, beltEntityId)) {
      world.destroy(decorationEntityId);
    }
  }

  private static syncTerminal(
    world: UserWorld,
    beltEntityId: EntityId,
    role: TransportBeltTerminalDecorationRole,
    side: TransportBeltSide,
    shouldExist: boolean,
  ): void {
    const existingDecorationEntityId = this.findOwnedDecorationEntityId(world, beltEntityId, role);

    if (!shouldExist || this.isTerminalTileOccupied(world, beltEntityId, side)) {
      if (existingDecorationEntityId !== null) {
        world.destroy(existingDecorationEntityId);
      }

      return;
    }

    const ownerTransform = world.get(beltEntityId, Transform2D);

    if (!ownerTransform) {
      if (existingDecorationEntityId !== null) {
        world.destroy(existingDecorationEntityId);
      }

      return;
    }

    const [offsetX, offsetY] = getTransportBeltSideVector(side);
    const localX = offsetX * GRID_CELL_SIZE;
    const localY = offsetY * GRID_CELL_SIZE;
    const absoluteWorldY = ownerTransform.curr.pos.y + localY;
    const ownerSprite = world.get(beltEntityId, AnimatedSprite);
    const renderVisibility = world.get(beltEntityId, RenderVisibility);
    const variant = this.resolveTerminalVariant(role, side);

    if (existingDecorationEntityId === null) {
      const decorationEntityId = world.create();

      world.add(decorationEntityId, new TransportBeltTerminalDecoration(beltEntityId, role));
      world.add(decorationEntityId, new Parent(beltEntityId));
      world.add(decorationEntityId, new Transform2D(localX, localY));
      world.add(
        decorationEntityId,
        createTransportBeltSprite(variant, absoluteWorldY, ownerSprite ?? undefined),
      );
      world.add(
        decorationEntityId,
        new RenderVisibility(renderVisibility?.role ?? OUTSIDE, renderVisibility?.baseAlpha ?? 1),
      );
      world.add(decorationEntityId, new Debug(`transport-belt-${role}`));
      return;
    }

    const decorationTransform = world.get(existingDecorationEntityId, Transform2D);

    if (decorationTransform) {
      decorationTransform.curr.pos.set(localX, localY);
      decorationTransform.prev.pos.set(localX, localY);
    } else {
      world.add(existingDecorationEntityId, new Transform2D(localX, localY));
    }

    world.add(
      existingDecorationEntityId,
      createTransportBeltSprite(variant, absoluteWorldY, ownerSprite ?? undefined),
    );
    world.add(
      existingDecorationEntityId,
      new RenderVisibility(renderVisibility?.role ?? OUTSIDE, renderVisibility?.baseAlpha ?? 1),
    );
  }

  private static isTerminalTileOccupied(
    world: UserWorld,
    beltEntityId: EntityId,
    side: TransportBeltSide,
  ): boolean {
    const coordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, beltEntityId);
    const targetCoordinates = TransportBeltGridQuery.resolveNeighborCoordinates(coordinates, side);

    return TransportBeltGridQuery.findBeltEntityAtCoordinates(world, targetCoordinates, {
      excludeEntityId: beltEntityId,
    }) !== null;
  }

  private static findOwnedDecorationEntityId(
    world: UserWorld,
    beltEntityId: EntityId,
    role: TransportBeltTerminalDecorationRole,
  ): EntityId | null {
    for (const decorationEntityId of world.query(TransportBeltTerminalDecoration)) {
      const decoration = world.get(decorationEntityId, TransportBeltTerminalDecoration);

      if (!decoration) {
        continue;
      }

      if (decoration.ownerEntityId === beltEntityId && decoration.role === role) {
        return decorationEntityId;
      }
    }

    return null;
  }

  private static findOwnedDecorationEntityIds(world: UserWorld, beltEntityId: EntityId): EntityId[] {
    const decorationEntityIds: EntityId[] = [];

    for (const decorationEntityId of world.query(TransportBeltTerminalDecoration)) {
      const decoration = world.get(decorationEntityId, TransportBeltTerminalDecoration);

      if (!decoration || decoration.ownerEntityId !== beltEntityId) {
        continue;
      }

      decorationEntityIds.push(decorationEntityId);
    }

    return decorationEntityIds;
  }

  private static resolveTerminalVariant(
    role: TransportBeltTerminalDecorationRole,
    side: TransportBeltSide,
  ): TransportBeltVariant {
    if (role === "start") {
      switch (side) {
        case "bottom":
          return "start-bottom";
        case "left":
          return "start-left";
        case "top":
          return "start-top";
        case "right":
          return "start-right";
      }
    }

    switch (side) {
      case "bottom":
        return "end-bottom";
      case "left":
        return "end-left";
      case "top":
        return "end-top";
      case "right":
        return "end-right";
    }
  }
}
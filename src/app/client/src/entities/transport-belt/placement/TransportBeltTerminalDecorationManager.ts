import {
    canConveyorStoreEntities,
    ConveyorBeltComponent,
    syncConveyorBeltDirectionsFromVariant,
} from "@client/components/conveyor-belt";
import type {
    TransportBeltDirection,
    TransportBeltVariant,
} from "@client/entities/transport-belt/consts";
import {
    getTransportBeltDirectionVector,
    TransportBeltGridQuery,
} from "@client/entities/transport-belt/core";
import {
    TransportBeltTerminalDecoration,
    type TransportBeltTerminalDecorationRole,
} from "@client/entities/transport-belt/placement/TransportBeltTerminalDecoration";
import { createTransportBeltSprite } from "@client/entities/transport-belt/render/createTransportBeltSprite";
import { GRID_CELL_SIZE } from "@client/systems/world/build-mode/const";
import type { EntityId, Registry } from "@engine";
import { AnimatedSprite, Debug, Transform2D } from "@engine/components";

export class TransportBeltTerminalDecorationManager {
  public static syncBelts(world: Registry, beltEntityIds: readonly (EntityId | null)[]): void {
    const visitedEntityIds = new Set<EntityId>();

    for (const beltEntityId of beltEntityIds) {
      if (beltEntityId === null || visitedEntityIds.has(beltEntityId)) {
        continue;
      }

      visitedEntityIds.add(beltEntityId);
      this.syncBelt(world, beltEntityId);
    }
  }

  public static syncBelt(world: Registry, beltEntityId: EntityId): void {
    const belt = world.get(beltEntityId, ConveyorBeltComponent);

    if (!belt || !canConveyorStoreEntities(belt.variant)) {
      this.destroyOwnedDecorations(world, beltEntityId);
      return;
    }

    syncConveyorBeltDirectionsFromVariant(belt);

    this.syncTerminal(world, beltEntityId, "start", belt.tailDirection, belt.previousEntityId === null);
    this.syncTerminal(world, beltEntityId, "end", belt.headDirection, belt.nextEntityId === null);
  }

  public static destroyOwnedDecorations(world: Registry, beltEntityId: EntityId): void {
    for (const decorationEntityId of this.findOwnedDecorationEntityIds(world, beltEntityId)) {
      world.destroy(decorationEntityId);
    }
  }

  private static syncTerminal(
    world: Registry,
    beltEntityId: EntityId,
    role: TransportBeltTerminalDecorationRole,
    direction: TransportBeltDirection,
    shouldExist: boolean,
  ): void {
    const existingDecorationEntityId = this.findOwnedDecorationEntityId(world, beltEntityId, role);

    if (!shouldExist || this.isTerminalTileOccupied(world, beltEntityId, direction)) {
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

    const [offsetX, offsetY] = getTransportBeltDirectionVector(direction);
    const localX = offsetX * GRID_CELL_SIZE;
    const localY = offsetY * GRID_CELL_SIZE;
    const ownerSprite = world.get(beltEntityId, AnimatedSprite);
    const variant = this.resolveTerminalVariant(role, direction);

    if (existingDecorationEntityId === null) {
      const decorationEntityId = world.create();

      world.add(decorationEntityId, new TransportBeltTerminalDecoration(beltEntityId, role));
      world.setParent(decorationEntityId, beltEntityId);
      world.add(decorationEntityId, new Transform2D(localX, localY));
      world.add(
        decorationEntityId,
        createTransportBeltSprite(variant, ownerSprite ?? undefined),
      );
      world.add(decorationEntityId, new Debug(`transport-belt-${role}`));
      return;
    }

    const decorationTransform = world.get(existingDecorationEntityId, Transform2D);

    if (decorationTransform) {
      world.patch(existingDecorationEntityId, Transform2D, (transform) => {
        transform.curr.pos.set(localX, localY);
        transform.prev.pos.set(localX, localY);
      });
    } else {
      world.add(existingDecorationEntityId, new Transform2D(localX, localY));
    }

    world.add(
      existingDecorationEntityId,
      createTransportBeltSprite(variant, ownerSprite ?? undefined),
    );
  }

  private static isTerminalTileOccupied(
    world: Registry,
    beltEntityId: EntityId,
    direction: TransportBeltDirection,
  ): boolean {
    const coordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, beltEntityId);
    const targetCoordinates = TransportBeltGridQuery.resolveNeighborCoordinatesInDirection(coordinates, direction);

    return TransportBeltGridQuery.findBeltEntityAtCoordinates(world, targetCoordinates, {
      excludeEntityId: beltEntityId,
    }) !== null;
  }

  private static findOwnedDecorationEntityId(
    world: Registry,
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

  private static findOwnedDecorationEntityIds(world: Registry, beltEntityId: EntityId): EntityId[] {
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
    direction: TransportBeltDirection,
  ): TransportBeltVariant {
    if (role === "start") {
      switch (direction) {
        case "south":
          return "start-bottom";
        case "west":
          return "start-left";
        case "north":
          return "start-top";
        case "east":
          return "start-right";
      }
    }

    switch (direction) {
      case "south":
        return "end-bottom";
      case "west":
        return "end-left";
      case "north":
        return "end-top";
      case "east":
        return "end-right";
    }
  }
}

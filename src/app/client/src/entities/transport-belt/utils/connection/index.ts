import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import { GridSingleton, type GridCoordinate, type GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";
import { Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type GridOffset = readonly [x: number, y: number];

type BeltConnectionOffsets = {
  previousOffset: GridOffset;
  nextOffset: GridOffset;
};

type BeltRelation = "previous" | "next";

/**********************************************************************************************************
 *   CONSTANTS
 **********************************************************************************************************/

const STRAIGHT_BELT_CONNECTION_OFFSETS: Readonly<Record<string, BeltConnectionOffsets>> = {
  "horizontal-right": {
    previousOffset: [-1, 0],
    nextOffset: [1, 0],
  },
  "horizontal-left": {
    previousOffset: [1, 0],
    nextOffset: [-1, 0],
  },
  "vertical-up": {
    previousOffset: [0, 1],
    nextOffset: [0, -1],
  },
  "vertical-down": {
    previousOffset: [0, -1],
    nextOffset: [0, 1],
  },
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

/**
 * Computes and maintains linked transport-belt topology.
 *
 * This utility is responsible for one-time spawn/remove belt connectivity so
 * per-frame motion systems can traverse stable chains without re-discovering
 * neighboring belts every update.
 */
export class TransportBeltConnectionUtils {
  /**
   * Connects a newly spawned belt to compatible neighboring straight belts.
   *
   * The belt stores `previousEntityId` and `nextEntityId`, and the tail belt in
   * each chain receives a `TransportBeltLeaf` marker used by motion systems.
   */
  public static connectSpawnedBelt(world: UserWorld, beltEntityId: EntityId): void {
    const belt = world.get(beltEntityId, ConveyorBeltComponent);

    if (!belt || !this.isConnectableVariant(belt.variant)) {
      return;
    }

    const coordinates = this.resolveBeltGridCoordinates(world, beltEntityId);

    if (!coordinates) {
      return;
    }

    const previousEntityId = this.findAdjacentBeltEntityId(
      world,
      beltEntityId,
      belt.variant,
      coordinates,
      "previous",
    );
    const nextEntityId = this.findAdjacentBeltEntityId(
      world,
      beltEntityId,
      belt.variant,
      coordinates,
      "next",
    );

    belt.previousEntityId = previousEntityId;
    belt.nextEntityId = nextEntityId;

    if (previousEntityId !== null) {
      const previousBelt = world.get(previousEntityId, ConveyorBeltComponent);

      if (previousBelt) {
        previousBelt.nextEntityId = beltEntityId;
        this.syncLeafMarker(world, previousEntityId, previousBelt);
      }
    }

    if (nextEntityId !== null) {
      const nextBelt = world.get(nextEntityId, ConveyorBeltComponent);

      if (nextBelt) {
        nextBelt.previousEntityId = beltEntityId;
        this.syncLeafMarker(world, nextEntityId, nextBelt);
      }
    }

    this.syncLeafMarker(world, beltEntityId, belt);
  }

  /**
   * Removes a belt from its chain and destroys it.
   *
   * The surrounding chains are intentionally broken at the removed belt so a
   * physical gap remains reflected in topology. Child entities parented to the
   * belt are also destroyed by the world hierarchy cleanup.
   */
  public static destroyBelt(world: UserWorld, beltEntityId: EntityId): void {
    const belt = world.get(beltEntityId, ConveyorBeltComponent);

    if (!belt) {
      world.destroy(beltEntityId);
      return;
    }

    const { previousEntityId, nextEntityId } = belt;

    if (previousEntityId !== null) {
      const previousBelt = world.get(previousEntityId, ConveyorBeltComponent);

      if (previousBelt && previousBelt.nextEntityId === beltEntityId) {
        previousBelt.nextEntityId = null;
        this.syncLeafMarker(world, previousEntityId, previousBelt);
      }
    }

    if (nextEntityId !== null) {
      const nextBelt = world.get(nextEntityId, ConveyorBeltComponent);

      if (nextBelt && nextBelt.previousEntityId === beltEntityId) {
        nextBelt.previousEntityId = null;
        this.syncLeafMarker(world, nextEntityId, nextBelt);
      }
    }

    belt.previousEntityId = null;
    belt.nextEntityId = null;

    world.destroy(beltEntityId);
  }

  private static findAdjacentBeltEntityId(
    world: UserWorld,
    beltEntityId: EntityId,
    variant: string,
    coordinates: GridCoordinates,
    relation: BeltRelation,
  ): EntityId | null {
    const offsets = STRAIGHT_BELT_CONNECTION_OFFSETS[variant];

    if (!offsets) {
      return null;
    }

    const targetOffset = relation === "previous"
      ? offsets.previousOffset
      : offsets.nextOffset;
    const targetCoordinates = this.offsetGridCoordinates(coordinates, targetOffset);
    let match: EntityId | null = null;

    world.forEach2(
      ConveyorBeltComponent,
      Transform2D,
      (candidateEntityId, candidateBelt, candidateTransform) => {
        if (match !== null || candidateEntityId === beltEntityId) {
          return;
        }

        if (!this.isConnectableVariant(candidateBelt.variant)) {
          return;
        }

        const candidateCoordinates = GridSingleton.worldToGridCoordinates(
          candidateTransform.curr.pos.x,
          candidateTransform.curr.pos.y,
        );

        if (!GridSingleton.areCoordinatesEqual(targetCoordinates, candidateCoordinates)) {
          return;
        }

        if (!this.isFacingCurrentCoordinates(candidateBelt.variant, candidateCoordinates, coordinates, relation)) {
          return;
        }

        match = candidateEntityId;
      },
    );

    return match;
  }

  private static isFacingCurrentCoordinates(
    candidateVariant: string,
    candidateCoordinates: GridCoordinates,
    currentCoordinates: GridCoordinates,
    relation: BeltRelation,
  ): boolean {
    const candidateOffsets = STRAIGHT_BELT_CONNECTION_OFFSETS[candidateVariant];

    if (!candidateOffsets) {
      return false;
    }

    const requiredOffset = relation === "previous"
      ? candidateOffsets.nextOffset
      : candidateOffsets.previousOffset;
    const candidateConnectedCoordinates = this.offsetGridCoordinates(candidateCoordinates, requiredOffset);

    return GridSingleton.areCoordinatesEqual(candidateConnectedCoordinates, currentCoordinates);
  }

  private static resolveBeltGridCoordinates(
    world: UserWorld,
    beltEntityId: EntityId,
  ): GridCoordinates | null {
    const transform = world.get(beltEntityId, Transform2D);

    if (!transform) {
      return null;
    }

    return GridSingleton.worldToGridCoordinates(transform.curr.pos.x, transform.curr.pos.y);
  }

  private static syncLeafMarker(
    world: UserWorld,
    beltEntityId: EntityId,
    belt: ConveyorBeltComponent,
  ): void {
    const shouldBeLeaf = this.isConnectableVariant(belt.variant) && belt.nextEntityId === null;

    if (shouldBeLeaf) {
      if (!world.has(beltEntityId, TransportBeltLeaf)) {
        world.add(beltEntityId, new TransportBeltLeaf());
      }

      return;
    }

    if (world.has(beltEntityId, TransportBeltLeaf)) {
      world.remove(beltEntityId, TransportBeltLeaf);
    }
  }

  private static isConnectableVariant(variant: string): boolean {
    return variant in STRAIGHT_BELT_CONNECTION_OFFSETS;
  }

  private static offsetGridCoordinates(
    coordinates: GridCoordinates,
    offset: GridOffset,
  ): GridCoordinates {
    return [
      (Number(coordinates[0]) + offset[0]) as GridCoordinate,
      (Number(coordinates[1]) + offset[1]) as GridCoordinate,
    ];
  }
}

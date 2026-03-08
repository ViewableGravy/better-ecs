import { canConveyorStoreEntities, ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import { GhostPreviewComponent } from "@client/entities/ghost";
import {
  getTransportBeltFlow,
  TRANSPORT_BELT_SIDE_GRID_OFFSETS,
} from "@client/entities/transport-belt/consts";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
import { GridSingleton, type GridCoordinate, type GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";
import { Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type BeltRelation = "previous" | "next";

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
    * Connects a newly spawned belt to compatible neighboring belts.
   *
   * The belt stores `previousEntityId` and `nextEntityId`, and the tail belt in
   * each chain receives a `TransportBeltLeaf` marker used by motion systems.
   */
  public static connectSpawnedBelt(world: UserWorld, beltEntityId: TransportBeltEntityId): void {
    const belt = world.get(beltEntityId, ConveyorBeltComponent);

    if (!this.isConnectableVariant(belt.variant)) {
      return;
    }

    const coordinates = this.resolveBeltGridCoordinates(world, beltEntityId);

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
      }
    }

    if (nextEntityId !== null) {
      const nextBelt = world.get(nextEntityId, ConveyorBeltComponent);

      if (nextBelt) {
        nextBelt.previousEntityId = beltEntityId;
      }
    }

    this.refreshLeafAnchors(world, [beltEntityId, previousEntityId, nextEntityId]);
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

    this.refreshLeafAnchors(world, [previousEntityId, nextEntityId]);
  }

  public static reconnectBelt(world: UserWorld, beltEntityId: TransportBeltEntityId): void {
    const belt = world.get(beltEntityId, ConveyorBeltComponent);

    if (!this.isConnectableVariant(belt.variant)) {
      return;
    }

    const coordinates = this.resolveBeltGridCoordinates(world, beltEntityId);

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
    const oldPreviousEntityId = belt.previousEntityId;
    const oldNextEntityId = belt.nextEntityId;

    belt.previousEntityId = previousEntityId;
    belt.nextEntityId = nextEntityId;

    if (oldPreviousEntityId !== null && oldPreviousEntityId !== previousEntityId) {
      const oldPreviousBelt = world.get(oldPreviousEntityId, ConveyorBeltComponent);

      if (oldPreviousBelt && oldPreviousBelt.nextEntityId === beltEntityId) {
        oldPreviousBelt.nextEntityId = null;
        this.syncLeafMarker(world, oldPreviousEntityId, oldPreviousBelt);
      }
    }

    if (oldNextEntityId !== null && oldNextEntityId !== nextEntityId) {
      const oldNextBelt = world.get(oldNextEntityId, ConveyorBeltComponent);

      if (oldNextBelt && oldNextBelt.previousEntityId === beltEntityId) {
        oldNextBelt.previousEntityId = null;
        this.syncLeafMarker(world, oldNextEntityId, oldNextBelt);
      }
    }

    if (previousEntityId !== null) {
      const previousBelt = world.get(previousEntityId, ConveyorBeltComponent);

      if (previousBelt) {
        previousBelt.nextEntityId = beltEntityId;
      }
    }

    if (nextEntityId !== null) {
      const nextBelt = world.get(nextEntityId, ConveyorBeltComponent);

      if (nextBelt) {
        nextBelt.previousEntityId = beltEntityId;
      }
    }

    this.refreshLeafAnchors(world, [
      beltEntityId,
      oldPreviousEntityId,
      oldNextEntityId,
      previousEntityId,
      nextEntityId,
    ]);
  }

  private static findAdjacentBeltEntityId(
    world: UserWorld,
    beltEntityId: EntityId,
    variant: string,
    coordinates: GridCoordinates,
    relation: BeltRelation,
  ): EntityId | null {
    const flow = getTransportBeltFlow(variant);

    if (!flow) {
      return null;
    }

    const [start, end] = flow;
    const targetSide = relation === "previous" ? start : end;
    const targetOffset = TRANSPORT_BELT_SIDE_GRID_OFFSETS[targetSide];
    const targetCoordinates = this.offsetGridCoordinates(coordinates, targetOffset);
    let match: EntityId | null = null;

    world.forEach2(
      ConveyorBeltComponent,
      Transform2D,
      (candidateEntityId, candidateBelt, candidateTransform) => {
        if (match !== null || candidateEntityId === beltEntityId) {
          return;
        }

        if (world.has(candidateEntityId, GhostPreviewComponent)) {
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
    const candidateFlow = getTransportBeltFlow(candidateVariant);

    if (!candidateFlow) {
      return false;
    }

    const [candidateStart, candidateEnd] = candidateFlow;
    const requiredSide = relation === "previous" ? candidateEnd : candidateStart;
    const requiredOffset = TRANSPORT_BELT_SIDE_GRID_OFFSETS[requiredSide];
    const candidateConnectedCoordinates = this.offsetGridCoordinates(candidateCoordinates, requiredOffset);

    return GridSingleton.areCoordinatesEqual(candidateConnectedCoordinates, currentCoordinates);
  }

  private static resolveBeltGridCoordinates(
    world: UserWorld,
    beltEntityId: TransportBeltEntityId,
  ): GridCoordinates {
    const transform = world.get(beltEntityId, Transform2D);

    return GridSingleton.worldToGridCoordinates(transform.curr.pos.x, transform.curr.pos.y);
  }

  private static syncLeafMarker(
    world: UserWorld,
    beltEntityId: EntityId,
    belt: ConveyorBeltComponent,
    shouldBeLeaf: boolean = this.isConnectableVariant(belt.variant) && belt.nextEntityId === null,
  ): void {
    belt.isLeaf = shouldBeLeaf;

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
    return canConveyorStoreEntities(variant) && getTransportBeltFlow(variant) !== undefined;
  }

  private static refreshLeafAnchors(
    world: UserWorld,
    seedEntityIds: readonly (EntityId | null)[],
  ): void {
    const visitedEntityIds = new Set<EntityId>();

    for (const seedEntityId of seedEntityIds) {
      if (seedEntityId === null || visitedEntityIds.has(seedEntityId)) {
        continue;
      }

      const componentEntityIds = this.collectConnectedComponentEntityIds(
        world,
        seedEntityId,
        visitedEntityIds,
      );

      if (componentEntityIds.length === 0) {
        continue;
      }

      this.assignLeafAnchorForComponent(world, componentEntityIds);
    }
  }

  private static collectConnectedComponentEntityIds(
    world: UserWorld,
    startEntityId: EntityId,
    visitedEntityIds: Set<EntityId>,
  ): EntityId[] {
    const pendingEntityIds = [startEntityId];
    const componentEntityIds: EntityId[] = [];

    while (pendingEntityIds.length > 0) {
      const currentEntityId = pendingEntityIds.pop();

      if (currentEntityId === undefined || visitedEntityIds.has(currentEntityId)) {
        continue;
      }

      const currentBelt = world.get(currentEntityId, ConveyorBeltComponent);

      if (!currentBelt) {
        continue;
      }

      visitedEntityIds.add(currentEntityId);
      componentEntityIds.push(currentEntityId);

      if (currentBelt.previousEntityId !== null) {
        pendingEntityIds.push(currentBelt.previousEntityId);
      }

      if (currentBelt.nextEntityId !== null) {
        pendingEntityIds.push(currentBelt.nextEntityId);
      }
    }

    return componentEntityIds;
  }

  private static assignLeafAnchorForComponent(
    world: UserWorld,
    componentEntityIds: readonly EntityId[],
  ): void {
    const openTailEntityId = this.resolveOpenTailEntityId(world, componentEntityIds);
    const preservedLoopAnchorEntityId = openTailEntityId === null
      ? this.resolveExistingLoopAnchorEntityId(world, componentEntityIds)
      : null;
    const anchorEntityId = openTailEntityId
      ?? preservedLoopAnchorEntityId
      ?? componentEntityIds[0]
      ?? null;

    for (const entityId of componentEntityIds) {
      const belt = world.get(entityId, ConveyorBeltComponent);

      if (!belt) {
        continue;
      }

      this.syncLeafMarker(world, entityId, belt, entityId === anchorEntityId);
    }
  }

  private static resolveOpenTailEntityId(
    world: UserWorld,
    componentEntityIds: readonly EntityId[],
  ): EntityId | null {
    for (const entityId of componentEntityIds) {
      const belt = world.get(entityId, ConveyorBeltComponent);

      if (!belt) {
        continue;
      }

      if (belt.nextEntityId === null) {
        return entityId;
      }
    }

    return null;
  }

  private static resolveExistingLoopAnchorEntityId(world: UserWorld, componentEntityIds: readonly EntityId[]): EntityId | null {
    for (const entityId of componentEntityIds) {
      const belt = world.get(entityId, ConveyorBeltComponent);

      if (!belt) {
        continue;
      }

      if (belt.isLeaf) {
        return entityId;
      }
    }

    return null;
  }

  private static offsetGridCoordinates(
    coordinates: GridCoordinates,
    offset: readonly [x: number, y: number],
  ): GridCoordinates {
    return [
      (Number(coordinates[0]) + offset[0]) as GridCoordinate,
      (Number(coordinates[1]) + offset[1]) as GridCoordinate,
    ];
  }
}

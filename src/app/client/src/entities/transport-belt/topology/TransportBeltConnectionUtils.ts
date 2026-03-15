import { canConveyorStoreEntities, ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import {
    getConveyorLaneSlots,
    getTransportBeltVariantDescriptor,
    setConveyorLaneTailBlocked,
    TransportBeltGridQuery,
} from "@client/entities/transport-belt/core";
import { TransportBeltTerminalDecorationManager } from "@client/entities/transport-belt/placement/TransportBeltTerminalDecorationManager";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";

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

    const coordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, beltEntityId);

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
        const previousHadNoNextConnection = previousBelt.nextEntityId === null;
        previousBelt.nextEntityId = beltEntityId;

        if (previousHadNoNextConnection) {
          this.blockTailTransfers(previousBelt);
        }
      }
    }

    if (nextEntityId !== null) {
      const nextBelt = world.get(nextEntityId, ConveyorBeltComponent);

      if (nextBelt) {
        nextBelt.previousEntityId = beltEntityId;
      }
    }

    this.refreshLeafAnchors(world, [beltEntityId, previousEntityId, nextEntityId]);
    this.syncTerminalDecorationsNearCoordinates(world, coordinates);
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

    const coordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, beltEntityId);

    TransportBeltTerminalDecorationManager.destroyOwnedDecorations(world, beltEntityId);

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
    this.syncTerminalDecorationsNearCoordinates(world, coordinates);
  }

  public static reconnectBelt(world: UserWorld, beltEntityId: TransportBeltEntityId): void {
    const belt = world.get(beltEntityId, ConveyorBeltComponent);

    if (!this.isConnectableVariant(belt.variant)) {
      return;
    }

    const coordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, beltEntityId);

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

    if (oldNextEntityId === null && nextEntityId !== null) {
      this.blockTailTransfers(belt);
    }

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
        const previousHadNoNextConnection = previousBelt.nextEntityId === null;
        previousBelt.nextEntityId = beltEntityId;

        if (previousHadNoNextConnection) {
          this.blockTailTransfers(previousBelt);
        }
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
    this.syncTerminalDecorationsNearCoordinates(world, coordinates);
  }

  /**
   * Recomputes belt topology from world layout after loading persisted state.
   *
   * Persisted previous/next pointers and loop anchors are runtime-derived state,
   * so they should be rebuilt from spatial neighbors when a scene is restored.
   */
  public static reconnectAllBelts(world: UserWorld): void {
    const beltEntityIds = [...world.query(ConveyorBeltComponent)];

    for (const beltEntityId of beltEntityIds) {
      const belt = world.get(beltEntityId, ConveyorBeltComponent);

      if (!belt || !this.isConnectableVariant(belt.variant)) {
        continue;
      }

      belt.previousEntityId = null;
      belt.nextEntityId = null;
      this.syncLeafMarker(world, beltEntityId, belt, false);
    }

    for (const beltEntityId of beltEntityIds) {
      const belt = world.get(beltEntityId, ConveyorBeltComponent);

      if (!belt || !this.isConnectableVariant(belt.variant)) {
        continue;
      }

      this.reconnectBelt(world, beltEntityId as TransportBeltEntityId);
    }
  }

  private static findAdjacentBeltEntityId(
    world: UserWorld,
    beltEntityId: EntityId,
    variant: string,
    coordinates: GridCoordinates,
    relation: BeltRelation,
  ): EntityId | null {
    const descriptor = getTransportBeltVariantDescriptor(variant);

    if (!descriptor) {
      return null;
    }

    const [start, end] = descriptor.flow;
    const targetSide = relation === "previous" ? start : end;
    const targetCoordinates = TransportBeltGridQuery.resolveNeighborCoordinates(coordinates, targetSide);

    return TransportBeltGridQuery.findBeltEntityAtCoordinates(world, targetCoordinates, {
      excludeEntityId: beltEntityId,
      predicate: (candidateEntityId, candidateBelt) => {
        if (!this.isConnectableVariant(candidateBelt.variant)) {
          return false;
        }

        return this.isFacingCurrentCoordinates(
          world,
          candidateEntityId,
          candidateBelt.variant,
          coordinates,
          relation,
        );
      },
    });
  }

  private static isFacingCurrentCoordinates(
    world: UserWorld,
    candidateEntityId: EntityId,
    candidateVariant: string,
    currentCoordinates: GridCoordinates,
    relation: BeltRelation,
  ): boolean {
    const descriptor = getTransportBeltVariantDescriptor(candidateVariant);

    if (!descriptor) {
      return false;
    }

    const [candidateStart, candidateEnd] = descriptor.flow;
    const requiredSide = relation === "previous" ? candidateEnd : candidateStart;
    const candidateCoordinates = TransportBeltGridQuery.resolveBeltCoordinates(world, candidateEntityId);
    const candidateConnectedCoordinates = TransportBeltGridQuery.resolveNeighborCoordinates(
      candidateCoordinates,
      requiredSide,
    );

    return candidateConnectedCoordinates[0] === currentCoordinates[0]
      && candidateConnectedCoordinates[1] === currentCoordinates[1];
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
    return canConveyorStoreEntities(variant) && getTransportBeltVariantDescriptor(variant) !== undefined;
  }

  private static blockTailTransfers(conveyor: ConveyorBeltComponent): void {
    for (const side of ["left", "right"] as const) {
      const slots = getConveyorLaneSlots(conveyor, side);

      if (slots[3] === null) {
        continue;
      }

      setConveyorLaneTailBlocked(conveyor, side, true);
    }
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

  private static syncTerminalDecorationsNearCoordinates(
    world: UserWorld,
    coordinates: GridCoordinates,
  ): void {
    const nearbyBeltEntityIds: EntityId[] = [];
    const centerBeltEntityId = TransportBeltGridQuery.findBeltEntityAtCoordinates(world, coordinates);

    if (centerBeltEntityId !== null) {
      nearbyBeltEntityIds.push(centerBeltEntityId);
    }

    for (const side of ["top", "right", "bottom", "left"] as const) {
      const neighborEntityId = TransportBeltGridQuery.resolveNeighborEntityId(world, coordinates, side);

      if (neighborEntityId === null) {
        continue;
      }

      nearbyBeltEntityIds.push(neighborEntityId);
    }

    TransportBeltTerminalDecorationManager.syncBelts(world, nearbyBeltEntityIds);
  }
}

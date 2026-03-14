import { PlaceableWallComponent } from "@client/entities/wall/components";
import { updatePlaceableWallVisual } from "@client/entities/wall/mutation/update";
import {
    derivePlaceableWallEndingLeftVariant,
    derivePlaceableWallEndingRightVariant,
    derivePlaceableWallHorizontalVariant,
    derivePlaceableWallSingleVariant,
    type PlaceableWallVisualVariant,
} from "@client/entities/wall/query/variant";
import {
    GridNeighborQuery,
    type CardinalSide,
} from "@client/systems/world/build-mode/grid-neighbor-query";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class PlaceableWallAutoShapeManager {
	public static refreshAffectedWalls(world: UserWorld, placedWallEntityId: EntityId): void {
		const placedCoordinates = GridNeighborQuery.resolveEntityCoordinates(world, placedWallEntityId);
		const affectedWallEntityIds = this.deriveWallEntityIdsAroundCoordinates(world, placedCoordinates, placedWallEntityId);

		this.refreshWallEntityIds(world, affectedWallEntityIds);
	}

	public static refreshWallsNearCoordinates(world: UserWorld, coordinates: GridCoordinates): void {
		const affectedWallEntityIds = this.deriveWallEntityIdsAroundCoordinates(world, coordinates);

		this.refreshWallEntityIds(world, affectedWallEntityIds);
	}

	public static deriveVariant(world: UserWorld, wallEntityId: EntityId): PlaceableWallVisualVariant {
		const coordinates = GridNeighborQuery.resolveEntityCoordinates(world, wallEntityId);

		return this.deriveVariantAtCoordinates(world, coordinates, wallEntityId);
	}

	public static deriveVariantAtCoordinates(
		world: UserWorld,
		coordinates: GridCoordinates,
		wallEntityId?: EntityId,
	): PlaceableWallVisualVariant {
		const hasLeftNeighbor = this.hasWallNeighbor(world, coordinates, "left", wallEntityId);
		const hasRightNeighbor = this.hasWallNeighbor(world, coordinates, "right", wallEntityId);
		const variantSeed = wallEntityId ?? Number(coordinates[0]) + Number(coordinates[1]);

		if (hasLeftNeighbor && hasRightNeighbor) {
			return derivePlaceableWallHorizontalVariant(variantSeed);
		}

		if (hasRightNeighbor) {
			return derivePlaceableWallEndingRightVariant(variantSeed);
		}

		if (hasLeftNeighbor) {
			return derivePlaceableWallEndingLeftVariant(variantSeed);
		}

		return derivePlaceableWallSingleVariant(variantSeed);
	}

	private static refreshWallEntityIds(world: UserWorld, wallEntityIds: EntityId[]): void {
		for (const wallEntityId of wallEntityIds) {
			updatePlaceableWallVisual(world, wallEntityId, this.deriveVariant(world, wallEntityId));
		}
	}

	private static deriveWallEntityIdsAroundCoordinates(
		world: UserWorld,
		coordinates: GridCoordinates,
		centerWallEntityId?: EntityId,
	): EntityId[] {
		const affectedWallEntityIds = new Set<EntityId>();

		if (centerWallEntityId !== undefined) {
			affectedWallEntityIds.add(centerWallEntityId);
		}

		const centerWallEntityIdAtCoordinates = this.findWallEntityAtCoordinates(world, coordinates);

		if (centerWallEntityIdAtCoordinates !== null) {
			affectedWallEntityIds.add(centerWallEntityIdAtCoordinates);
		}

		for (const side of ["top", "right", "bottom", "left"] as const) {
			const neighborWallEntityId = this.deriveNeighborWallEntityId(world, coordinates, side);

			if (neighborWallEntityId === null) {
				continue;
			}

			affectedWallEntityIds.add(neighborWallEntityId);
		}

		return [...affectedWallEntityIds];
	}

	private static hasWallNeighbor(
		world: UserWorld,
		coordinates: GridCoordinates,
		side: CardinalSide,
		wallEntityId?: EntityId,
	): boolean {
		return this.deriveNeighborWallEntityId(world, coordinates, side, wallEntityId) !== null;
	}

	private static findWallEntityAtCoordinates(
		world: UserWorld,
		coordinates: GridCoordinates,
		excludeEntityId?: EntityId,
	): EntityId | null {
		return GridNeighborQuery.findEntityAtCoordinates(
			world,
			world.query(PlaceableWallComponent),
			(wallEntityId) => world.require(wallEntityId, PlaceableWallComponent),
			coordinates,
			{
				excludeEntityId,
			},
		);
	}

	private static deriveNeighborWallEntityId(
		world: UserWorld,
		coordinates: GridCoordinates,
		side: CardinalSide,
		excludeEntityId?: EntityId,
	): EntityId | null {
		return GridNeighborQuery.resolveNeighborEntityId(
			world,
			world.query(PlaceableWallComponent),
			(wallEntityId) => world.require(wallEntityId, PlaceableWallComponent),
			coordinates,
			side,
			{
				excludeEntityId,
			},
		);
	}
}

import { OUTSIDE } from "@client/components/render-visibility";
import { destroyPlaceableWall } from "@client/entities/wall/mutation/delete";
import { spawnPlaceableWall } from "@client/entities/wall/spawn/placeable";
import { PlaceableWallAutoShapeManager } from "@client/entities/wall/utils/shapeManager";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { BOX_SIZE, HALF_BOX_SIZE } from "@client/systems/world/build-mode/metrics";
import { UserWorld, World, type EntityId } from "@engine";
import { Sprite } from "@engine/components";
import { RectangleCollider } from "@libs/physics";
import { describe, expect, it } from "vitest";

const SINGLE_WALL_ASSET_IDS = ["wall-single:1", "wall-single:2"];
const LEFT_CONNECTION_WALL_ASSET_IDS = ["wall-ending-left:1", "wall-ending-left:2"];
const RIGHT_CONNECTION_WALL_ASSET_IDS = ["wall-ending-right:1", "wall-ending-right:2"];

describe("PlaceableWallAutoShapeManager", () => {
	it("renders an isolated wall as a single sprite", () => {
		const world = new UserWorld(new World("scene"));
		const wallEntityId = spawnWallAt(world, 0, 0);

		PlaceableWallAutoShapeManager.refreshAffectedWalls(world, wallEntityId);

		expect(SINGLE_WALL_ASSET_IDS).toContain(world.require(wallEntityId, Sprite).assetId);
	});

	it("renders a two-wall chain with left and right ending sprites", () => {
		const world = new UserWorld(new World("scene"));
		const leftWallEntityId = spawnWallAt(world, 0, 0);
		const rightWallEntityId = spawnWallAt(world, 20, 0);

		PlaceableWallAutoShapeManager.refreshAffectedWalls(world, rightWallEntityId);

		expect(RIGHT_CONNECTION_WALL_ASSET_IDS).toContain(world.require(leftWallEntityId, Sprite).assetId);
		expect(LEFT_CONNECTION_WALL_ASSET_IDS).toContain(world.require(rightWallEntityId, Sprite).assetId);
	});

	it("renders middle walls as horizontal segments when both horizontal neighbors exist", () => {
		const world = new UserWorld(new World("scene"));

		const leftWallEntityId = spawnWallAt(world, 0, 0);
		const middleWallEntityId = spawnWallAt(world, 20, 0);
		const rightWallEntityId = spawnWallAt(world, 40, 0);

		PlaceableWallAutoShapeManager.refreshAffectedWalls(world, middleWallEntityId);
		PlaceableWallAutoShapeManager.refreshAffectedWalls(world, rightWallEntityId);

		expect(RIGHT_CONNECTION_WALL_ASSET_IDS).toContain(world.require(leftWallEntityId, Sprite).assetId);
		expect(world.require(middleWallEntityId, Sprite).assetId.startsWith("wall-horizontal:")).toBe(true);
		expect(LEFT_CONNECTION_WALL_ASSET_IDS).toContain(world.require(rightWallEntityId, Sprite).assetId);
	});

	it("returns adjacent walls to single sprites after a horizontal neighbor is removed", () => {
		const world = new UserWorld(new World("scene"));

		const leftWallEntityId = spawnWallAt(world, 0, 0);
		const middleWallEntityId = spawnWallAt(world, 20, 0);
		const rightWallEntityId = spawnWallAt(world, 40, 0);
		const removedCoordinates = GridSingleton.worldToGridCoordinates(20, 0);

		PlaceableWallAutoShapeManager.refreshAffectedWalls(world, rightWallEntityId);
		destroyPlaceableWall(world, middleWallEntityId);
		PlaceableWallAutoShapeManager.refreshWallsNearCoordinates(world, removedCoordinates);

		expect(SINGLE_WALL_ASSET_IDS).toContain(world.require(leftWallEntityId, Sprite).assetId);
		expect(SINGLE_WALL_ASSET_IDS).toContain(world.require(rightWallEntityId, Sprite).assetId);
	});

	it("uses a grounded collider covering the bottom 30 percent of the tile", () => {
		const world = new UserWorld(new World("scene"));
		const wallEntityId = spawnWallAt(world, 0, 0);
		const collider = world.require(wallEntityId, RectangleCollider);

		expect(collider.bounds.left).toBe(-HALF_BOX_SIZE);
		expect(collider.bounds.top).toBe(HALF_BOX_SIZE - Math.round(BOX_SIZE * 0.3));
		expect(collider.bounds.size.x).toBe(BOX_SIZE);
		expect(collider.bounds.size.y).toBe(Math.round(BOX_SIZE * 0.3));
	});
});

function spawnWallAt(world: UserWorld, x: number, y: number): EntityId {
	const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(
		GridSingleton.worldToGridCoordinates(x, y),
	);

	return spawnPlaceableWall(world, {
		snappedX,
		snappedY,
		renderVisibilityRole: OUTSIDE,
	});
}

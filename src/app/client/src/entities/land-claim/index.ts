import { RENDER_LAYERS } from "@client/consts";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { GridFootprint } from "@client/systems/world/build-mode/components/grid-footprint";
import { GridPosition } from "@client/systems/world/build-mode/components/grid-position";
import { Placeable } from "@client/systems/world/build-mode/components/placeable";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import {
    BOX_SIZE,
    HALF_BOX_SIZE,
} from "@client/systems/world/build-mode/metrics";
import { Vec2, type EntityId, type Registry } from "@engine";
import {
    Debug,
    FillColor,
    Rgba,
    Shape,
    Sprite,
    StrokeColor,
    Transform2D,
} from "@engine/components";
import { RectangleCollider } from "@libs/physics";

import { LandClaim } from "@client/entities/land-claim/component";
import {
    LAND_CLAIM_BUILDABLE_FILL,
    LAND_CLAIM_BUILDABLE_RADIUS_TILES,
    LAND_CLAIM_BUILDABLE_WORLD_SIZE,
    LAND_CLAIM_FLAG_FILL,
    LAND_CLAIM_FLAG_HEIGHT,
    LAND_CLAIM_FLAG_OFFSET_X,
    LAND_CLAIM_FLAG_OFFSET_Y,
    LAND_CLAIM_FLAG_POLE_HEIGHT,
    LAND_CLAIM_FLAG_POLE_WIDTH,
    LAND_CLAIM_FLAG_STROKE,
    LAND_CLAIM_FLAG_WIDTH,
    LAND_CLAIM_NAMEPLATE_ASSET_ID,
    LAND_CLAIM_NAMEPLATE_HEIGHT,
    LAND_CLAIM_NAMEPLATE_OFFSET_Y,
    LAND_CLAIM_NAMEPLATE_WIDTH,
    LAND_CLAIM_OWNED_FILL,
    LAND_CLAIM_OWNED_RADIUS_TILES,
    LAND_CLAIM_OWNED_WORLD_SIZE,
    LAND_CLAIM_OWNER_NAME,
    LAND_CLAIM_POLE_FILL,
    LAND_CLAIM_POLE_STROKE,
} from "@client/entities/land-claim/const";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type SpawnLandClaimOptions = {
  snappedX: number;
  snappedY: number;
  ownerName: string;
};

type SpawnPlacedLandClaimOptions = SpawnLandClaimOptions & {
  profile?: "placed";
};

type SpawnPreviewLandClaimOptions = {
  snappedX: number;
  snappedY: number;
  ownerName?: string;
  profile: "preview";
};

type SpawnLandClaimProfileOptions = SpawnPlacedLandClaimOptions | SpawnPreviewLandClaimOptions;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function spawnLandClaim(world: Registry, options: SpawnLandClaimProfileOptions): EntityId {
  const landClaim = world.create();
  const centerX = options.snappedX + HALF_BOX_SIZE;
  const centerY = options.snappedY + HALF_BOX_SIZE;

  world.add(landClaim, new Transform2D(centerX, centerY));
  addLandClaimRenderable(world, landClaim);

  if (options.profile === "preview") {
    const ownerName = options.ownerName ?? LAND_CLAIM_OWNER_NAME;

    spawnClaimOverlay(
      world,
      landClaim,
      LAND_CLAIM_BUILDABLE_WORLD_SIZE,
      LAND_CLAIM_BUILDABLE_FILL,
      -99,
      "land-claim-buildable-overlay-ghost",
    );
    spawnClaimOverlay(
      world,
      landClaim,
      LAND_CLAIM_OWNED_WORLD_SIZE,
      LAND_CLAIM_OWNED_FILL,
      -98,
      "land-claim-owned-overlay-ghost",
    );
    spawnFlagCloth(world, landClaim, "land-claim-ghost-flag");
    spawnNameplate(world, landClaim, "land-claim-ghost-nameplate");
    world.add(landClaim, new Debug(`${ownerName}-land-claim-ghost`));

    return landClaim;
  }

  const placedOptions = options;

  const [gridX, gridY] = GridSingleton.worldToGridCoordinates(options.snappedX, options.snappedY);

  world.add(
    landClaim,
    new RectangleCollider(
      new Vec2(-(HALF_BOX_SIZE - 1), -(HALF_BOX_SIZE - 1)),
      new Vec2(BOX_SIZE - 2, BOX_SIZE - 2),
    ),
  );
  world.add(landClaim, CollisionProfiles.solid());
  world.add(landClaim, new GridPosition(gridX, gridY));
  world.add(landClaim, new GridFootprint(BOX_SIZE, BOX_SIZE));
  world.add(landClaim, new Placeable("land-claim"));
  world.add(
    landClaim,
    new LandClaim(
      placedOptions.ownerName,
      LAND_CLAIM_OWNED_RADIUS_TILES,
      LAND_CLAIM_BUILDABLE_RADIUS_TILES,
    ),
  );
  world.add(landClaim, new Debug("land-claim"));

  spawnClaimOverlay(
    world,
    landClaim,
    LAND_CLAIM_BUILDABLE_WORLD_SIZE,
    LAND_CLAIM_BUILDABLE_FILL,
    -99,
    "land-claim-buildable-overlay",
  );
  spawnClaimOverlay(
    world,
    landClaim,
    LAND_CLAIM_OWNED_WORLD_SIZE,
    LAND_CLAIM_OWNED_FILL,
    -98,
    "land-claim-owned-overlay",
  );
  spawnFlagCloth(world, landClaim);
  spawnNameplate(world, landClaim);

  return landClaim;
}

function addLandClaimRenderable(world: Registry, entityId: EntityId): void {
  world.add(
    entityId,
    new Shape(
      "rectangle",
      LAND_CLAIM_FLAG_POLE_WIDTH,
      LAND_CLAIM_FLAG_POLE_HEIGHT,
      1,
      0.35,
      RENDER_LAYERS.world,
    ),
  );
  world.add(entityId, new FillColor(cloneColor(LAND_CLAIM_POLE_FILL)));
  world.add(entityId, new StrokeColor(cloneColor(LAND_CLAIM_POLE_STROKE)));
}

function spawnClaimOverlay(
  world: Registry,
  parentEntityId: EntityId,
  size: number,
  fill: Rgba,
  zOrder: number,
  debugLabel: string,
): void {
  const overlayEntityId = world.create();
  const overlayFill = new Rgba(fill.r, fill.g, fill.b, fill.a);

  world.setParent(overlayEntityId, parentEntityId);
  world.add(overlayEntityId, new Transform2D(0, 0));
  world.add(
    overlayEntityId,
    new Shape(
      "rectangle",
      size,
      size,
      0,
      zOrder,
      RENDER_LAYERS.background,
    ),
  );
  world.add(overlayEntityId, new FillColor(overlayFill));
  world.add(overlayEntityId, new Debug(debugLabel));
}

function spawnFlagCloth(
  world: Registry,
  parentEntityId: EntityId,
  debugLabel: string = "land-claim-flag",
): void {
  const flagEntityId = world.create();

  world.setParent(flagEntityId, parentEntityId);
  world.add(flagEntityId, new Transform2D(LAND_CLAIM_FLAG_OFFSET_X, LAND_CLAIM_FLAG_OFFSET_Y));
  world.add(
    flagEntityId,
    new Shape(
      "rectangle",
      LAND_CLAIM_FLAG_WIDTH,
      LAND_CLAIM_FLAG_HEIGHT,
      1,
      0.45,
      RENDER_LAYERS.world,
    ),
  );
  world.add(flagEntityId, new FillColor(cloneColor(LAND_CLAIM_FLAG_FILL)));
  world.add(flagEntityId, new StrokeColor(cloneColor(LAND_CLAIM_FLAG_STROKE)));
  world.add(flagEntityId, new Debug(debugLabel));
}

function spawnNameplate(
  world: Registry,
  parentEntityId: EntityId,
  debugLabel: string = "land-claim-nameplate",
): void {
  const nameplateEntityId = world.create();
  const sprite = new Sprite(
    LAND_CLAIM_NAMEPLATE_ASSET_ID,
    LAND_CLAIM_NAMEPLATE_WIDTH,
    LAND_CLAIM_NAMEPLATE_HEIGHT,
  );

  sprite.layer = RENDER_LAYERS.world;
  sprite.zOrder = 0.55;
  sprite.isDynamic = false;

  world.setParent(nameplateEntityId, parentEntityId);
  world.add(nameplateEntityId, new Transform2D(0, LAND_CLAIM_NAMEPLATE_OFFSET_Y));
  world.add(nameplateEntityId, sprite);
  world.add(nameplateEntityId, new Debug(debugLabel));
}

function cloneColor(color: Rgba): Rgba {
  return new Rgba(color.r, color.g, color.b, color.a);
}

export { LandClaim } from "@client/entities/land-claim/component";
export { LandClaimQuery } from "@client/entities/land-claim/LandClaimQuery";

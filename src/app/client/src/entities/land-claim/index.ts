import { RenderVisibility, type RenderVisibilityRole } from "@client/components/render-visibility";
import { RENDER_LAYERS } from "@client/consts";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { GridFootprint } from "@client/systems/world/build-mode/components/grid-footprint";
import { GridPosition } from "@client/systems/world/build-mode/components/grid-position";
import { Placeable } from "@client/systems/world/build-mode/components/placeable";
import {
  BOX_SIZE,
  HALF_BOX_SIZE,
} from "@client/systems/world/build-mode/metrics";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { Vec2, type EntityId, type UserWorld } from "@engine";
import {
  Color,
  Debug,
  Parent,
  Shape,
  Sprite,
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
  renderVisibilityRole: RenderVisibilityRole;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function spawnLandClaim(world: UserWorld, options: SpawnLandClaimOptions): EntityId {
  const landClaim = world.create();
  const centerX = options.snappedX + HALF_BOX_SIZE;
  const centerY = options.snappedY + HALF_BOX_SIZE;
  const [gridX, gridY] = GridSingleton.worldToGridCoordinates(options.snappedX, options.snappedY);

  world.add(landClaim, new Transform2D(centerX, centerY));
  world.add(
    landClaim,
    new Shape(
      "rectangle",
      LAND_CLAIM_FLAG_POLE_WIDTH,
      LAND_CLAIM_FLAG_POLE_HEIGHT,
      cloneColor(LAND_CLAIM_POLE_FILL),
      cloneColor(LAND_CLAIM_POLE_STROKE),
      1,
      0.35,
      RENDER_LAYERS.world,
    ),
  );
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
      options.ownerName,
      LAND_CLAIM_OWNED_RADIUS_TILES,
      LAND_CLAIM_BUILDABLE_RADIUS_TILES,
    ),
  );
  world.add(landClaim, new RenderVisibility(options.renderVisibilityRole, 1));
  world.add(landClaim, new Debug("land-claim"));

  spawnClaimOverlay(
    world,
    landClaim,
    LAND_CLAIM_BUILDABLE_WORLD_SIZE,
    LAND_CLAIM_BUILDABLE_FILL,
    options.renderVisibilityRole,
    -99,
    "land-claim-buildable-overlay",
  );
  spawnClaimOverlay(
    world,
    landClaim,
    LAND_CLAIM_OWNED_WORLD_SIZE,
    LAND_CLAIM_OWNED_FILL,
    options.renderVisibilityRole,
    -98,
    "land-claim-owned-overlay",
  );
  spawnFlagCloth(world, landClaim, options.renderVisibilityRole);
  spawnNameplate(world, landClaim, options.renderVisibilityRole);

  return landClaim;
}

function spawnClaimOverlay(
  world: UserWorld,
  parentEntityId: EntityId,
  size: number,
  fill: Color,
  renderVisibilityRole: RenderVisibilityRole,
  zOrder: number,
  debugLabel: string,
): void {
  const overlayEntityId = world.create();
  const overlayFill = new Color(fill.r, fill.g, fill.b, 1);

  world.add(overlayEntityId, new Parent(parentEntityId));
  world.add(overlayEntityId, new Transform2D(0, 0));
  world.add(
    overlayEntityId,
    new Shape(
      "rectangle",
      size,
      size,
      overlayFill,
      null,
      0,
      zOrder,
      RENDER_LAYERS.background,
    ),
  );
  world.add(overlayEntityId, new RenderVisibility(renderVisibilityRole, fill.a));
  world.add(overlayEntityId, new Debug(debugLabel));
}

function spawnFlagCloth(
  world: UserWorld,
  parentEntityId: EntityId,
  renderVisibilityRole: RenderVisibilityRole,
): void {
  const flagEntityId = world.create();

  world.add(flagEntityId, new Parent(parentEntityId));
  world.add(flagEntityId, new Transform2D(LAND_CLAIM_FLAG_OFFSET_X, LAND_CLAIM_FLAG_OFFSET_Y));
  world.add(
    flagEntityId,
    new Shape(
      "rectangle",
      LAND_CLAIM_FLAG_WIDTH,
      LAND_CLAIM_FLAG_HEIGHT,
      cloneColor(LAND_CLAIM_FLAG_FILL),
      cloneColor(LAND_CLAIM_FLAG_STROKE),
      1,
      0.45,
      RENDER_LAYERS.world,
    ),
  );
  world.add(flagEntityId, new RenderVisibility(renderVisibilityRole, 1));
  world.add(flagEntityId, new Debug("land-claim-flag"));
}

function spawnNameplate(
  world: UserWorld,
  parentEntityId: EntityId,
  renderVisibilityRole: RenderVisibilityRole,
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

  world.add(nameplateEntityId, new Parent(parentEntityId));
  world.add(nameplateEntityId, new Transform2D(0, LAND_CLAIM_NAMEPLATE_OFFSET_Y));
  world.add(nameplateEntityId, sprite);
  world.add(nameplateEntityId, new RenderVisibility(renderVisibilityRole, 1));
  world.add(nameplateEntityId, new Debug("land-claim-nameplate"));
}

function cloneColor(color: Color): Color {
  return new Color(color.r, color.g, color.b, color.a);
}

export { LandClaim } from "@client/entities/land-claim/component";
export { LandClaimQuery } from "@client/entities/land-claim/LandClaimQuery";


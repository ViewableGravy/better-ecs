import { createGearAssetId, type GearAssetId, type GearSizeVariant } from "@client/assets/iron-gear";
import { RENDER_LAYERS } from "@client/consts";
import { OUTSIDE, RenderVisibility } from "@client/scenes/world/components/render-visibility";
import type { EntityId, UserWorld } from "@engine";
import { Debug, Sprite, Transform2D } from "@engine/components";

type SpawnGearOptions = {
  x?: number;
  y?: number;
  size?: GearSizeVariant;
};

const GEAR_RENDER_SIZE_BY_VARIANT: Record<GearSizeVariant, number> = {
  large: 10,
  medium: 4,
  small: 3,
  "extra-small": 2,
};

export function spawnGear(world: UserWorld, options: SpawnGearOptions = {}): EntityId {
  const sizeVariant = options.size ?? "large";
  const assetId: GearAssetId = createGearAssetId(sizeVariant);
  const renderSize = GEAR_RENDER_SIZE_BY_VARIANT[sizeVariant];

  const gear = world.create();
  const sprite = new Sprite(assetId, renderSize, renderSize);

  sprite.layer = RENDER_LAYERS.world;
  sprite.zOrder = 0.3;

  world.add(gear, new Transform2D(options.x ?? 0, options.y ?? 0, 0));
  world.add(gear, sprite);
  world.add(gear, new RenderVisibility(OUTSIDE, 1));
  world.add(gear, new Debug("gear"));

  return gear;
}
import { ironGearSheet } from "@client/assets/iron-gear";
import { OUTSIDE, RenderVisibility } from "@client/components/render-visibility";
import { RENDER_LAYERS } from "@client/consts";
import type { EntityId, UserWorld } from "@engine";
import { Debug, Sprite, Transform2D } from "@engine/components";

type GearSizeVariant = Extract<keyof typeof ironGearSheet.sprites, string>;

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
  const assetId: `iron-gear:${GearSizeVariant}` = `iron-gear:${sizeVariant}`;
  const renderSize = GEAR_RENDER_SIZE_BY_VARIANT[sizeVariant];

  const gear = world.create();
  const sprite = new Sprite(assetId, renderSize, renderSize);

  sprite.layer = RENDER_LAYERS.world;
  sprite.zOrder = 0.3;
  sprite.isDynamic = false;

  world.add(gear, new Transform2D(options.x ?? 0, options.y ?? 0, 0));
  world.add(gear, sprite);
  world.add(gear, new RenderVisibility(OUTSIDE, 1));
  world.add(gear, new Debug("gear"));

  return gear;
}
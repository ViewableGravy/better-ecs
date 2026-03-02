import { RENDER_LAYERS } from "@client/consts";
import type { EntityId, UserWorld } from "@engine";
import { AnimatedSprite, Debug, Transform2D } from "@engine/components";
import { OUTSIDE, RenderVisibility } from "@client/scenes/world/components/render-visibility";

export const TRANSPORT_BELT_VARIANTS = [
  "horizontal-right",
  "horizontal-left",
  "vertical-up",
  "vertical-down",
  "angled-right-up",
  "angled-up-right",
  "angled-left-up",
  "angled-top-left",
  "angled-bottom-right",
  "angled-right-bottom",
  "angled-bottom-left",
  "angled-left-bottom",
  "start-bottom",
  "end-bottom",
  "start-left",
  "end-left",
  "start-top",
  "end-top",
  "start-right",
  "end-right",
] as const;

export type TransportBeltVariant = (typeof TRANSPORT_BELT_VARIANTS)[number];
const TRANSPORT_BELT_FRAMES = [
  1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15, 16,
] as const;

type TransportBeltFrame = (typeof TRANSPORT_BELT_FRAMES)[number];
type TransportBeltAssetId = `transport-belt:${TransportBeltVariant}_${TransportBeltFrame}`;

const TRANSPORT_BELT_QUAD_SIZE = 40;
const TRANSPORT_BELT_FRAME_SIZE = 128;
const TRANSPORT_BELT_Z_BASE = 0.2;
const TRANSPORT_BELT_Z_PER_WORLD_Y = 0.000001;

function createTransportBeltAssetId(variant: TransportBeltVariant, frame: TransportBeltFrame): TransportBeltAssetId {
  return `transport-belt:${variant}_${frame}`;
}

function getTransportBeltAnimationAssets(variant: TransportBeltVariant): TransportBeltAssetId[] {
  const assets: TransportBeltAssetId[] = [];

  for (const frame of TRANSPORT_BELT_FRAMES) {
    assets.push(createTransportBeltAssetId(variant, frame));
  }

  return assets;
}

export function getAllTransportBeltAssetIds(): TransportBeltAssetId[] {
  const assets: TransportBeltAssetId[] = [];

  for (const variant of TRANSPORT_BELT_VARIANTS) {
    for (const frame of TRANSPORT_BELT_FRAMES) {
      assets.push(createTransportBeltAssetId(variant, frame));
    }
  }

  return assets;
}

type SpawnTransportBeltOptions = {
  x: number;
  y: number;
  variant?: TransportBeltVariant;
};

export function spawnTransportBelt(world: UserWorld, options: SpawnTransportBeltOptions): EntityId {
  const variant = options.variant ?? "horizontal-right";
  const scale = TRANSPORT_BELT_QUAD_SIZE / TRANSPORT_BELT_FRAME_SIZE;

  const belt = world.create();
  const sprite = new AnimatedSprite({
    assets: getTransportBeltAnimationAssets(variant),
    width: TRANSPORT_BELT_FRAME_SIZE * scale,
    height: TRANSPORT_BELT_FRAME_SIZE * scale,
    useGlobalOffset: true,
  });

  sprite.playbackRate = 0.5;

  sprite.layer = RENDER_LAYERS.world;
  sprite.zOrder = TRANSPORT_BELT_Z_BASE + options.y * TRANSPORT_BELT_Z_PER_WORLD_Y;

  world.add(belt, new Transform2D(options.x, options.y, 0));
  world.add(belt, sprite);
  world.add(belt, new RenderVisibility(OUTSIDE, 1));
  world.add(belt, new Debug("transport-belt"));

  return belt;
}

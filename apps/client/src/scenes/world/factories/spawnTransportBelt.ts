import { RENDER_LAYERS } from "@/consts";
import type { UserWorld } from "@repo/engine";
import { AnimatedSprite, Debug, Transform2D } from "@repo/engine/components";
import { OUTSIDE, RenderVisibility } from "../components/render-visibility";

export type TransportBeltVariant =
  | "horizontal-right"
  | "horizontal-left"
  | "vertical-up"
  | "vertical-down"
  | "angled-right-up"
  | "angled-up-right"
  | "angled-left-up"
  | "angled-top-left"
  | "angled-bottom-right"
  | "angled-right-bottom"
  | "angled-bottom-left"
  | "angled-left-bottom"
  | "start-bottom"
  | "end-bottom"
  | "start-left"
  | "end-left"
  | "start-top"
  | "end-top"
  | "start-right"
  | "end-right";

export const TRANSPORT_BELT_VARIANTS: readonly TransportBeltVariant[] = [
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
];

const TRANSPORT_BELT_FRAME_COUNT = 16;
const TRANSPORT_BELT_QUAD_SIZE = 56;

const TRANSPORT_BELT_FRAME_SIZE_BY_VARIANT: Record<TransportBeltVariant, { w: number; h: number }> = {
  "horizontal-right": { w: 68, h: 74 },
  "horizontal-left": { w: 68, h: 74 },
  "vertical-up": { w: 71, h: 66 },
  "vertical-down": { w: 71, h: 66 },
  "angled-right-up": { w: 73, h: 80 },
  "angled-up-right": { w: 73, h: 78 },
  "angled-left-up": { w: 72, h: 80 },
  "angled-top-left": { w: 72, h: 78 },
  "angled-bottom-right": { w: 68, h: 69 },
  "angled-right-bottom": { w: 68, h: 69 },
  "angled-bottom-left": { w: 72, h: 69 },
  "angled-left-bottom": { w: 72, h: 69 },
  "start-bottom": { w: 72, h: 22 },
  "end-bottom": { w: 72, h: 22 },
  "start-left": { w: 24, h: 73 },
  "end-left": { w: 24, h: 73 },
  "start-top": { w: 72, h: 21 },
  "end-top": { w: 72, h: 21 },
  "start-right": { w: 26, h: 73 },
  "end-right": { w: 27, h: 73 },
};

function getTransportBeltAnimationAssets(variant: TransportBeltVariant): string[] {
  const assets: string[] = [];

  for (let frame = 1; frame <= TRANSPORT_BELT_FRAME_COUNT; frame += 1) {
    assets.push(`transport-belt:${variant}_${frame}`);
  }

  return assets;
}

export function getAllTransportBeltAssetIds(): string[] {
  const assets: string[] = [];

  for (const variant of TRANSPORT_BELT_VARIANTS) {
    for (let frame = 1; frame <= TRANSPORT_BELT_FRAME_COUNT; frame += 1) {
      assets.push(`transport-belt:${variant}_${frame}`);
    }
  }

  return assets;
}

type SpawnTransportBeltOptions = {
  x: number;
  y: number;
  variant?: TransportBeltVariant;
};

export function spawnTransportBelt(world: UserWorld, options: SpawnTransportBeltOptions): number {
  const variant = options.variant ?? "horizontal-right";
  const frameSize = TRANSPORT_BELT_FRAME_SIZE_BY_VARIANT[variant];
  const scale = Math.min(TRANSPORT_BELT_QUAD_SIZE / frameSize.w, TRANSPORT_BELT_QUAD_SIZE / frameSize.h);

  const belt = world.create();
  const sprite = new AnimatedSprite({
    assets: getTransportBeltAnimationAssets(variant),
    width: frameSize.w * scale,
    height: frameSize.h * scale,
  });

  sprite.playbackRate = 0.01;

  sprite.layer = RENDER_LAYERS.world;
  sprite.zOrder = 1;

  world.add(belt, new Transform2D(options.x, options.y, 0));
  world.add(belt, sprite);
  world.add(belt, new RenderVisibility(OUTSIDE, 1));
  world.add(belt, new Debug("transport-belt"));

  return belt;
}

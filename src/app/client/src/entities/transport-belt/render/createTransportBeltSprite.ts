import { RENDER_LAYERS } from "@client/consts";
import type { TransportBeltVariant } from "@client/entities/transport-belt/consts";
import { AnimatedSprite, Color } from "@engine/components";

const TRANSPORT_BELT_FRAMES = [
  1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15, 16,
] as const;

const TRANSPORT_BELT_QUAD_SIZE = 40;
const TRANSPORT_BELT_FRAME_SIZE = 128;
const TRANSPORT_BELT_Z_BASE = 0.2;
const TRANSPORT_BELT_Z_PER_WORLD_Y = 0.000001;

export function createTransportBeltSprite(
  variant: TransportBeltVariant,
  worldY: number,
  previousSprite?: AnimatedSprite,
): AnimatedSprite {
  const scale = TRANSPORT_BELT_QUAD_SIZE / TRANSPORT_BELT_FRAME_SIZE;
  const sprite = new AnimatedSprite({
    assets: TRANSPORT_BELT_FRAMES.map((frame) => `transport-belt:${variant}_${frame}` as const),
    width: TRANSPORT_BELT_FRAME_SIZE * scale,
    height: TRANSPORT_BELT_FRAME_SIZE * scale,
    tint: previousSprite
      ? new Color(
        previousSprite.tint.r,
        previousSprite.tint.g,
        previousSprite.tint.b,
        previousSprite.tint.a,
      )
      : undefined,
    useGlobalOffset: true,
  });

  sprite.playbackRate = previousSprite?.playbackRate ?? 0.5;
  sprite.startTime = previousSprite?.startTime ?? sprite.startTime;
  sprite.layer = previousSprite?.layer ?? RENDER_LAYERS.world;
  sprite.zOrder = TRANSPORT_BELT_Z_BASE + worldY * TRANSPORT_BELT_Z_PER_WORLD_Y;

  return sprite;
}
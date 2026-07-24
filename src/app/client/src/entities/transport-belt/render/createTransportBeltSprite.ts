import { RENDER_LAYERS } from "@client/consts";
import type { TransportBeltVariant } from "@client/entities/transport-belt/consts";
import { CONVEYOR_ANIMATION_PLAYBACK_RATE } from "@client/entities/transport-belt/motion/constants";
import { AnimatedSprite } from "@engine/components";

const TRANSPORT_BELT_FRAMES = [
  1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15, 16,
] as const;

const TRANSPORT_BELT_QUAD_SIZE = 40;
const TRANSPORT_BELT_FRAME_SIZE = 128;
const TRANSPORT_BELT_ASSETS_BY_VARIANT = new Map<TransportBeltVariant, readonly string[]>();

export function createTransportBeltSprite(
  variant: TransportBeltVariant,
  previousSprite?: AnimatedSprite,
): AnimatedSprite {
  const scale = TRANSPORT_BELT_QUAD_SIZE / TRANSPORT_BELT_FRAME_SIZE;
  const sprite = new AnimatedSprite({
    assets: getTransportBeltFrameAssetIds(variant),
    width: TRANSPORT_BELT_FRAME_SIZE * scale,
    height: TRANSPORT_BELT_FRAME_SIZE * scale,
    playbackMode: "tick",
    useGlobalOffset: true,
    frameSelectionMode: "shader",
  });

  sprite.playbackRate = previousSprite?.playbackRate ?? CONVEYOR_ANIMATION_PLAYBACK_RATE;
  sprite.playbackMode = previousSprite?.playbackMode ?? "tick";
  sprite.startTime = previousSprite?.startTime ?? sprite.startTime;
  sprite.startTick = previousSprite?.startTick ?? sprite.startTick;
  sprite.useGlobalOffset = previousSprite?.useGlobalOffset ?? sprite.useGlobalOffset;
  sprite.layer = RENDER_LAYERS.belts;
  sprite.isDynamic = false;

  return sprite;
}

function getTransportBeltFrameAssetIds(variant: TransportBeltVariant): readonly string[] {
  const existing = TRANSPORT_BELT_ASSETS_BY_VARIANT.get(variant);
  if (existing) {
    return existing;
  }

  const created = TRANSPORT_BELT_FRAMES.map((frame) => `transport-belt:${variant}_${frame}`);
  TRANSPORT_BELT_ASSETS_BY_VARIANT.set(variant, created);
  return created;
}

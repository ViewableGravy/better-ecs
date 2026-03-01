import {
    getTransportBeltAnimationAssets,
    type TransportBeltVariant,
} from "@/assets/conveyor";
import { RENDER_LAYERS } from "@/consts";
import type { UserWorld } from "@repo/engine";
import { AnimatedSprite, Debug, Transform2D } from "@repo/engine/components";
import { OUTSIDE, RenderVisibility } from "../components/render-visibility";

type SpawnTransportBeltOptions = {
  x: number;
  y: number;
  variant?: TransportBeltVariant;
};

const TRANSPORT_BELT_SIZE = 56;

export function spawnTransportBelt(world: UserWorld, options: SpawnTransportBeltOptions): number {
  const belt = world.create();
  const sprite = new AnimatedSprite({
    assets: getTransportBeltAnimationAssets(options.variant ?? "horizontal-right"),
    width: TRANSPORT_BELT_SIZE,
    height: TRANSPORT_BELT_SIZE,
  });

  sprite.playbackRate = 0.5;

  sprite.layer = RENDER_LAYERS.world;
  sprite.zOrder = 1;

  world.add(belt, new Transform2D(options.x, options.y, 0));
  world.add(belt, sprite);
  world.add(belt, new RenderVisibility(OUTSIDE, 1));
  world.add(belt, new Debug("transport-belt"));

  return belt;
}

import { RENDER_LAYERS } from "@/consts";
import type { UserWorld } from "@repo/engine";
import { AnimatedSprite, Debug, Transform2D } from "@repo/engine/components";
import { OUTSIDE, RenderVisibility } from "../components/render-visibility";

type SpawnTransportBeltOptions = {
  x: number;
  y: number;
};

const TRANSPORT_BELT_SIZE = 56;

export function spawnTransportBelt(world: UserWorld, options: SpawnTransportBeltOptions): number {
  const belt = world.create();
  const sprite = new AnimatedSprite({
    assets: [
      "transport-belt:horizontal-right_1",
      "transport-belt:horizontal-right_2",
      "transport-belt:horizontal-right_3",
      "transport-belt:horizontal-right_4",
      "transport-belt:horizontal-right_5",
      "transport-belt:horizontal-right_6",
      "transport-belt:horizontal-right_7",
      "transport-belt:horizontal-right_8",
      "transport-belt:horizontal-right_9",
      "transport-belt:horizontal-right_10",
      "transport-belt:horizontal-right_11",
      "transport-belt:horizontal-right_12",
      "transport-belt:horizontal-right_13",
      "transport-belt:horizontal-right_14",
      "transport-belt:horizontal-right_15",
      "transport-belt:horizontal-right_16",
    ],
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

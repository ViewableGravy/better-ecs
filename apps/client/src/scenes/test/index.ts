import { createScene, useAssets, useWorld } from "@repo/engine";
import { Camera, Transform2D } from "@repo/engine/components";
import { ensurePlayer } from "../../entities/player";

export const Scene = createScene("TestScene")({
  async setup() {
    const world = useWorld();
    const Assets = useAssets();

    // Load the player sprite asset (cached after first load)
    await Assets.load("player-sprite");

    useCamera();
    ensurePlayer(world, Assets);
  },
});

function useCamera() {
  const world = useWorld();

  const cameraEntity = world.create();
  world.add(cameraEntity, new Transform2D(0, 0));
  world.add(cameraEntity, new Camera("orthographic", 300)); // orthoSize of 300 world units
}

import { spawnCamera } from "@/entities/camera";
import { createScene, useAssets, useSystem, useWorld } from "@repo/engine";
import { spawnPlayer } from "../../entities/player";
import { System as SceneDemoSystem } from "../../systems/scene-demo";

export const Scene = createScene("TestScene")({
  systems: [SceneDemoSystem],
  async setup() {
    const world = useWorld();
    const Assets = useAssets();

    // Scene-level systems should be available via `useSystem` while this scene is active.
    const sceneDemo = useSystem("client:scene-demo");
    void sceneDemo;

    // Load the player sprite asset (cached after first load)
    await Assets.load("player-sprite");

    spawnCamera(world);
    spawnPlayer(world);
  },
});

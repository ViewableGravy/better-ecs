# Scene-Level Systems

Scene-level systems are systems that run **only while a specific scene is active**, and can access the active scene via `useScene()`.

## Defining a scene-level system

```ts
import z from "zod";
import { createScene, createSystem, useScene, useWorld } from "@repo/engine";

const sceneSystem = createSystem("scene:example")({
  schema: {
    default: null,
    schema: z.null(),
  },
  phase: "update",
  system() {
    const scene = useScene();
    const world = useWorld();

    // Scene metadata
    void scene.name;

    // Default world
    void world;

    // Additional worlds (if your scene created them)
    for (const [id, otherWorld] of scene.getAllWorlds()) {
      void id;
      void otherWorld;
    }
  },
});

export const GameScene = createScene("game")({
  systems: [sceneSystem],
  setup() {
    // Scene default world setup
  },
  sceneSetup(scene) {
    // Optional: register additional worlds
    scene.loadAdditionalWorld("overworld");
  },
});
```

## API

- `useScene()` → returns the active `SceneContext`

`SceneContext`:

- `name` (scene name)
- `getDefaultWorld()`
- `getWorld(id)`
- `getAllWorlds()`
- `hasWorld(id)`
- `loadAdditionalWorld(id)`
- `unloadWorld(id)`

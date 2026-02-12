import { spawnCamera } from "@/entities/camera";
import { ensurePlayer } from "@/entities/player";
import { createScene } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import { contextId, defineContext, installSpatialContexts } from "@repo/plugins";

import { System as SpatialContextsDemoSystem } from "@/systems/spatial-contexts-demo";

const OVERWORLD = contextId("default");
const HOUSE = contextId("house_1");

export const Scene = createScene("SpatialContextsDemo")({
  systems: [SpatialContextsDemoSystem],

  async sceneSetup(scene) {
    const manager = installSpatialContexts(scene, {
      definitions: [
        defineContext({
          id: OVERWORLD,
          policy: {
            visibility: "stack",
            simulation: "focused-only",
          },
          setup(world) {
            spawnCamera(world);
            ensurePlayer(world);

            // Overworld backdrop shape
            const bg = world.create();
            world.add(bg, new Transform2D(0, 0));
            world.add(
              bg,
              new Shape("rectangle", 1200, 800, new Color(0.15, 0.2, 0.25, 1), null, 0, -100, -100),
            );

            // Door marker (walk right past it)
            const door = world.create();
            world.add(door, new Transform2D(250, 0));
            world.add(
              door,
              new Shape(
                "rectangle",
                40,
                80,
                new Color(0.9, 0.9, 0.2, 1),
                new Color(0, 0, 0, 1),
                2,
                10,
                0,
              ),
            );
          },
        }),
        defineContext({
          id: HOUSE,
          parentId: OVERWORLD,
          policy: {
            visibility: "focused-only",
            simulation: "focused-only",
          },
          setup(world) {
            spawnCamera(world);
            ensurePlayer(world);

            // House interior
            const room = world.create();
            world.add(room, new Transform2D(0, 0));
            world.add(
              room,
              new Shape(
                "rectangle",
                800,
                500,
                new Color(0.35, 0.25, 0.2, 1),
                new Color(0.1, 0.08, 0.06, 1),
                6,
                -100,
                -100,
              ),
            );

            // Exit marker (walk left past it)
            const exit = world.create();
            world.add(exit, new Transform2D(-250, 0));
            world.add(
              exit,
              new Shape(
                "rectangle",
                40,
                80,
                new Color(0.2, 0.9, 0.6, 1),
                new Color(0, 0, 0, 1),
                2,
                10,
                0,
              ),
            );
          },
        }),
      ],
      focusedContextId: OVERWORLD,
    });

    // Preload the house world so focus switches are instant.
    await manager.ensureWorldLoaded(HOUSE);
  },

  setup() {
    // All world setup happens in context definitions.
  },
});

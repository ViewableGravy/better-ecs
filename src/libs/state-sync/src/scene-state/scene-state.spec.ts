import { describe, expect, it } from "vitest";

import { createDiffCommandsForSceneStateDelta } from "@libs/state-sync/scene-state/diff/diff";
import type { SerializedSceneState } from "@libs/state-sync/scene-state/types";

function createSceneState(): SerializedSceneState {
  return {
    sceneName: "world",
    worlds: [
      {
        worldId: "default",
        world: {
          sceneId: "world",
          entities: [
            {
              entityId: 1,
              components: [
                {
                  type: "Marker",
                  data: {
                    label: "alpha",
                    nested: {
                      count: 1,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

describe("scene state diffing", () => {
  it("emits component field patches instead of replacing unchanged fields", () => {
    const current = createSceneState();
    const target = structuredClone(current);
    const defaultWorld = target.worlds[0];
    const marker = defaultWorld.world.entities[0]?.components[0];

    if (!marker) {
      throw new Error("Expected marker component in test fixture");
    }

    marker.data.label = "delta";

    const commands = createDiffCommandsForSceneStateDelta(current, target);

    expect(commands).toEqual([
      {
        op: "set-field",
        version: 1,
        worldId: "default",
        entityId: 1,
        componentType: "Marker",
        changes: {
          label: "delta",
        },
      },
    ]);
  });

  it("emits create and add commands for newly introduced worlds and entities", () => {
    const current = createSceneState();
    const target: SerializedSceneState = {
      sceneName: "world",
      worlds: [
        {
          worldId: "default",
          world: {
            sceneId: "world",
            entities: [
              {
                entityId: 1,
                components: [
                  {
                    type: "Marker",
                    data: {
                      label: "alpha",
                      nested: {
                        count: 1,
                      },
                    },
                  },
                ],
              },
              {
                entityId: 2,
                components: [
                  {
                    type: "Marker",
                    data: {
                      label: "gamma",
                    },
                  },
                ],
              },
            ],
          },
        },
        {
          worldId: "house",
          world: {
            sceneId: "world:house",
            entities: [
              {
                entityId: 9,
                components: [
                  {
                    type: "Door",
                    data: {
                      open: true,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const commands = createDiffCommandsForSceneStateDelta(current, target);

    expect(commands).toEqual([
      {
        op: "create-entity",
        version: 1,
        worldId: "default",
        entityId: 2,
      },
      {
        op: "add-component",
        version: 2,
        worldId: "default",
        entityId: 2,
        componentType: "Marker",
        data: {
          label: "gamma",
        },
      },
      {
        op: "create-entity",
        version: 3,
        worldId: "house",
        entityId: 9,
      },
      {
        op: "add-component",
        version: 4,
        worldId: "house",
        entityId: 9,
        componentType: "Door",
        data: {
          open: true,
        },
      },
    ]);
  });
});
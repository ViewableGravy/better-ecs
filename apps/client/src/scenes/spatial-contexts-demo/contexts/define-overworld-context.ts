import { Color } from "@repo/engine/components";
import { defineContext, type ContextId } from "@repo/spatial-contexts";
import { spawnContextEntryRegion } from "../factories/spawnContextEntryRegion";
import { spawnDoor } from "../factories/spawnDoor";
import { spawnHouse } from "../factories/spawnHouse";
import { spawnTree } from "../factories/spawnTree";
import { spawnWall } from "../factories/spawnWall";
import { createHouseLayout } from "../utilities/house-layout";
import { setupContextPlayer } from "./shared";

type OverworldContextOptions = {
  overworldId: ContextId;
  houseId: ContextId;
  dungeonId: ContextId;
  houseHalfWidth: number;
  houseHalfHeight: number;
};

export function defineOverworldContext(options: OverworldContextOptions) {
  return defineContext({
    id: options.overworldId,
    policy: {
      visibility: "stack",
      simulation: "focused-only",
    },
    setup(world) {
      setupContextPlayer(world, -320, 0);

      const houseLayout = createHouseLayout(options.houseHalfWidth, options.houseHalfHeight);


      spawnHouse(world, {
        x: 0,
        y: 0,
        width: options.houseHalfWidth * 2,
        height: options.houseHalfHeight * 2,
        contextId: options.houseId,
      });

      for (const segment of houseLayout.wallSegments) {
        spawnWall(world, {
          x: segment.x,
          y: segment.y,
          width: segment.width,
          height: segment.height,
          visible: false,
        });
      }

      spawnDoor(world, {
        x: houseLayout.doorway.x,
        y: houseLayout.doorway.y,
        width: houseLayout.doorway.width,
        height: houseLayout.doorway.height,
        fill: new Color(0.25, 0.55, 0.95, 1),
        stroke: new Color(0.08, 0.2, 0.42, 1),
        hasCollider: false,
        role: "outside",
      });

      spawnContextEntryRegion(world, {
        topLeftX: -options.houseHalfWidth,
        topLeftY: -options.houseHalfHeight,
        width: options.houseHalfWidth * 2,
        height: options.houseHalfHeight * 2,
        targetContextId: options.houseId,
      });

      spawnTree(world, { x: -260, y: -140 });
      spawnTree(world, { x: -340, y: 90 });
      spawnTree(world, { x: -190, y: 190 });
      spawnTree(world, { x: 320, y: -130 });
      spawnTree(world, { x: 260, y: 170 });
      spawnTree(world, { x: 120, y: 250 });
      spawnTree(world, { x: -40, y: -270 });

      spawnDoor(world, {
        x: 0,
        y: -220,
        fill: new Color(0.5, 0.65, 1, 1),
        role: "outside",
        portal: {
          mode: "teleport",
          targetContextId: options.dungeonId,
          spawn: { x: 0, y: 160 },
          label: "Overworld -> Dungeon",
        },
      });
    },
  });
}

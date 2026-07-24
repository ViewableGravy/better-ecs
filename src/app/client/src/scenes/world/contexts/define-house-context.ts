import { spawnBackground } from "@client/entities/background";
import { spawnChair } from "@client/entities/chair";
import { spawnDoor } from "@client/entities/door";
import { spawnTable } from "@client/entities/table";
import { spawnWall } from "@client/entities/wall";
import { createHouseLayout } from "@client/scenes/world/utilities/house-layout";
import type { Registry } from "@engine";
import { Rgba } from "@engine/components";

type HouseContextOptions = {
  houseHalfWidth: number;
  houseHalfHeight: number;
  overworldDestination: { x: number; y: number };
  dungeonDestination: { x: number; y: number };
};

export function setupHouse(world: Registry, options: HouseContextOptions): void {
      const houseLayout = createHouseLayout(options.houseHalfWidth, options.houseHalfHeight);

      spawnBackground(world, {
        width: options.houseHalfWidth * 2,
        height: options.houseHalfHeight * 2,
        color: new Rgba(0.4, 0.3, 0.2, 1),
        stroke: new Rgba(0.18, 0.1, 0.07, 1),
        strokeWidth: 6,
        gridBounds: true,
      });

      for (const segment of houseLayout.wallSegments) {
        spawnWall(world, {
          x: segment.x,
          y: segment.y,
          width: segment.width,
          height: segment.height,
        });
      }

      spawnDoor(world, {
        x: houseLayout.doorway.x,
        y: houseLayout.doorway.y,
        width: houseLayout.doorway.width,
        height: houseLayout.doorway.height,
        fill: new Rgba(0.25, 0.55, 0.95, 1),
        stroke: new Rgba(0.08, 0.2, 0.42, 1),
        hasCollider: false,
        portal: {
          destination: options.overworldDestination,
          label: "House -> Overworld",
        },
      });

      spawnTable(world, { x: -60, y: -30, radius: 28 });
      spawnTable(world, { x: 120, y: 70, radius: 24 });
      spawnChair(world, { x: -120, y: -30 });
      spawnChair(world, { x: -10, y: -30 });
      spawnChair(world, { x: 120, y: 100 });
      spawnChair(world, { x: 140, y: 70 });

      spawnDoor(world, {
        x: 120,
        y: 0,
        fill: new Rgba(0.85, 0.85, 0.85, 1),
        portal: {
          destination: options.dungeonDestination,
          label: "House -> Dungeon",
        },
      });
}

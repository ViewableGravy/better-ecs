import { OUTSIDE } from "@client/components/render-visibility";
import { spawnContextEntryRegion } from "@client/entities/context-entry-region";
import { spawnDemoShaderQuad } from "@client/entities/demo-shader-quad";
import { spawnDoor } from "@client/entities/door";
import { spawnGear } from "@client/entities/gear";
import { spawnHouse } from "@client/entities/house";
import { spawnOreField } from "@client/entities/ore-field";
import {
  spawnTransportBelt,
  TRANSPORT_BELT_VARIANTS,
  type TransportBeltVariant,
} from "@client/entities/transport-belt";
import { ConveyorUtils } from "@client/entities/transport-belt/conveyor-utils";
import { spawnTree } from "@client/entities/tree";
import { spawnWall } from "@client/entities/wall";
import { setupContextPlayer } from "@client/scenes/world/contexts/shared";
import { createHouseLayout } from "@client/scenes/world/utilities/house-layout";
import type { UserWorld } from "@engine";
import { Color } from "@engine/components";
import { defineContext, type ContextId } from "@libs/spatial-contexts";

type OverworldContextOptions = {
  overworldId: ContextId;
  houseId: ContextId;
  dungeonId: ContextId;
  houseHalfWidth: number;
  houseHalfHeight: number;
};

const BELT_SPACING = 20;

function spawnBeltRow(
  world: UserWorld,
  options: {
    x: number;
    y: number;
    bodyCount: number;
    leftEdge: TransportBeltVariant;
    body: TransportBeltVariant;
    rightEdge: TransportBeltVariant;
  },
) {
  spawnTransportBelt(world, {
    x: options.x,
    y: options.y,
    variant: options.leftEdge,
  });

  for (let index = 0; index < options.bodyCount; index += 1) {
    spawnTransportBelt(world, {
      x: options.x + (index + 1) * BELT_SPACING,
      y: options.y,
      variant: options.body,
    });
  }

  spawnTransportBelt(world, {
    x: options.x + (options.bodyCount + 1) * BELT_SPACING,
    y: options.y,
    variant: options.rightEdge,
  });
}

function spawnBeltLoop(
  world: UserWorld,
  options: {
    x: number;
    y: number;
    sideLength: number;
    top: TransportBeltVariant;
    right: TransportBeltVariant;
    bottom: TransportBeltVariant;
    left: TransportBeltVariant;
    topLeft: TransportBeltVariant;
    topRight: TransportBeltVariant;
    bottomRight: TransportBeltVariant;
    bottomLeft: TransportBeltVariant;
  },
) {
  const maxOffset = options.sideLength - 1;

  spawnTransportBelt(world, {
    x: options.x,
    y: options.y,
    variant: options.topLeft,
  });
  spawnTransportBelt(world, {
    x: options.x + maxOffset * BELT_SPACING,
    y: options.y,
    variant: options.topRight,
  });
  spawnTransportBelt(world, {
    x: options.x + maxOffset * BELT_SPACING,
    y: options.y + maxOffset * BELT_SPACING,
    variant: options.bottomRight,
  });
  spawnTransportBelt(world, {
    x: options.x,
    y: options.y + maxOffset * BELT_SPACING,
    variant: options.bottomLeft,
  });

  for (let offset = 1; offset < maxOffset; offset += 1) {
    spawnTransportBelt(world, {
      x: options.x + offset * (BELT_SPACING),
      y: options.y,
      variant: options.top,
    });
    spawnTransportBelt(world, {
      x: options.x + maxOffset * BELT_SPACING,
      y: options.y + offset * BELT_SPACING,
      variant: options.right,
    });
    spawnTransportBelt(world, {
      x: options.x + offset * BELT_SPACING,
      y: options.y + maxOffset * BELT_SPACING,
      variant: options.bottom,
    });
    spawnTransportBelt(world, {
      x: options.x,
      y: options.y + offset * BELT_SPACING,
      variant: options.left,
    });
  }
}

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
        role: OUTSIDE,
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

      spawnDemoShaderQuad(world, {
        x: -500,
        y: -96,
      });

      spawnDoor(world, {
        x: 0,
        y: -220,
        fill: new Color(0.5, 0.65, 1, 1),
        role: OUTSIDE,
        portal: {
          mode: "teleport",
          targetContextId: options.dungeonId,
          spawn: { x: 0, y: 160 },
          label: "Overworld -> Dungeon",
        },
      });

      spawnOreField(world, {
        centerX: 700,
        centerY: 360,
      });

      function testSpawnTransportWithGears(x: number, y: number, variant: TransportBeltVariant) {
        const demoItemBelt = spawnTransportBelt(world, {
          x: x,
          y: y,
          variant,
        });

        const leftA = spawnGear(world, { size: "large" });
        const leftB = spawnGear(world, { size: "large" });
        const leftC = spawnGear(world, { size: "large" });
        const leftD = spawnGear(world, { size: "large" });
        const rightA = spawnGear(world, { size: "large" });
        const rightB = spawnGear(world, { size: "large" });

        ConveyorUtils.addEntity(world, demoItemBelt, leftA, "left", 0);
        ConveyorUtils.addEntity(world, demoItemBelt, leftB, "left", 1);
        ConveyorUtils.addEntity(world, demoItemBelt, leftC, "left", 2);
        ConveyorUtils.addEntity(world, demoItemBelt, leftD, "left", 3);
        ConveyorUtils.addEntity(world, demoItemBelt, rightA, "right", 0);
        ConveyorUtils.addEntity(world, demoItemBelt, rightB, "right", 2);
      }

      const demoGridStartX = -220;
      const demoGridStartY = 540;
      const demoGridColumns = 5;
      const demoGridStep = BELT_SPACING * 2;

      for (const [index, variant] of TRANSPORT_BELT_VARIANTS.entries()) {
        const column = index % demoGridColumns;
        const row = Math.floor(index / demoGridColumns);

        testSpawnTransportWithGears(
          demoGridStartX + column * demoGridStep,
          demoGridStartY + row * demoGridStep,
          variant,
        );
      }

      // performance testing (currently ~70-80 fps)
      for (const x of [500,600,700,800,900,1000,1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000]) {
        for (const y of [60, 80, 100, 120, 140, 160]) {
          testSpawnTransportWithGears(x, y, "horizontal-right");
          testSpawnTransportWithGears(x + 20, y, "horizontal-right");
          testSpawnTransportWithGears(x + 40, y, "horizontal-right");
          testSpawnTransportWithGears(x + 60, y, "horizontal-right");
          testSpawnTransportWithGears(x + 80, y, "horizontal-right");

          testSpawnTransportWithGears(x, y, "horizontal-left");
          testSpawnTransportWithGears(x + 20, y, "horizontal-left");
          testSpawnTransportWithGears(x + 40, y, "horizontal-left");
          testSpawnTransportWithGears(x + 60, y, "horizontal-left");
          testSpawnTransportWithGears(x + 80, y, "horizontal-left");
        }
      }

      const demoStartX = -450;
      const leftRowY = 287;
      const rightRowY = 336;

      spawnBeltRow(world, {
        x: demoStartX,
        y: leftRowY,
        bodyCount: 8,
        leftEdge: "end-left",
        body: "horizontal-left",
        rightEdge: "start-right",
      });

      spawnBeltRow(world, {
        x: demoStartX,
        y: rightRowY,
        bodyCount: 8,
        leftEdge: "start-left",
        body: "horizontal-right",
        rightEdge: "end-right",
      });

      spawnBeltLoop(world, {
        x: demoStartX,
        y: 426,
        sideLength: 5,
        top: "horizontal-right",
        right: "vertical-down",
        bottom: "horizontal-left",
        left: "vertical-up",
        topLeft: "angled-bottom-right",
        topRight: "angled-left-bottom",
        bottomRight: "angled-top-left",
        bottomLeft: "angled-right-up",
      });

      spawnBeltLoop(world, {
        x: 340,
        y: 420,
        sideLength: 5,
        top: "horizontal-left",
        right: "vertical-up",
        bottom: "horizontal-right",
        left: "vertical-down",
        topLeft: "angled-right-bottom",
        topRight: "angled-bottom-left",
        bottomRight: "angled-left-up",
        bottomLeft: "angled-up-right",
      });
    },
  });
}

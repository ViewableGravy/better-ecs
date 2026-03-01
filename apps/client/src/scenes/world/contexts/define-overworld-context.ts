import type { UserWorld } from "@repo/engine";
import { Color } from "@repo/engine/components";
import { defineContext, type ContextId } from "@repo/spatial-contexts";
import { OUTSIDE } from "../components/render-visibility";
import { spawnContextEntryRegion } from "../factories/spawnContextEntryRegion";
import { spawnDemoShaderQuad } from "../factories/spawnDemoShaderQuad";
import { spawnDoor } from "../factories/spawnDoor";
import { spawnHouse } from "../factories/spawnHouse";
import { spawnOreField } from "../factories/spawnOreField";
import { spawnTransportBelt, type TransportBeltVariant } from "../factories/spawnTransportBelt";
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

const BELT_SPACING = 28;

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

      const demoStartX = -440;
      const leftRowY = 280;
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
        x: 80,
        y: 420,
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

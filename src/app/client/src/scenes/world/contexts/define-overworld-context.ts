import {
    canConveyorStoreEntities,
    type ConveyorSide,
    type ConveyorSlotIndex,
} from "@client/components/conveyor-belt";
import { OUTSIDE } from "@client/components/render-visibility";
import { spawnContextEntryRegion } from "@client/entities/context-entry-region";
import { spawnDemoShaderQuad } from "@client/entities/demo-shader-quad";
import { spawnDoor } from "@client/entities/door";
import { spawnGear } from "@client/entities/gear";
import { spawnHouse } from "@client/entities/house";
import { spawnOreField } from "@client/entities/ore-field";
import {
    ConveyorUtils,
    spawnTransportBelt,
    TRANSPORT_BELT_VARIANTS,
    type TransportBeltEntityId,
    type TransportBeltVariant,
} from "@client/entities/transport-belt";
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

type DemoCogPlacement = {
  side: ConveyorSide;
  index: ConveyorSlotIndex;
  progress: number;
};

type BeltLoopEntityIds = {
  topLeft: TransportBeltEntityId;
  topRight: TransportBeltEntityId;
  bottomRight: TransportBeltEntityId;
  bottomLeft: TransportBeltEntityId;
  topEdges: TransportBeltEntityId[];
  rightEdges: TransportBeltEntityId[];
  bottomEdges: TransportBeltEntityId[];
  leftEdges: TransportBeltEntityId[];
};

const BELT_SPACING = 20;
const STRAIGHT_BELT_DEMO_COG_LAYOUTS: Readonly<Partial<Record<TransportBeltVariant, readonly DemoCogPlacement[]>>> = {
  "horizontal-right": [
    { side: "left", index: 0, progress: 0 },
  ],
  "horizontal-left": [
    { side: "left", index: 0, progress: 0 },
    { side: "left", index: 1, progress: 0 },
  ],
  "vertical-up": [
    { side: "left", index: 0, progress: 0 },
    { side: "left", index: 2, progress: 0 },
    { side: "right", index: 1, progress: 0 },
  ],
  "vertical-down": [
    { side: "left", index: 0, progress: 0 },
    { side: "left", index: 1, progress: 0 },
    { side: "left", index: 2, progress: 0 },
    { side: "right", index: 0, progress: 0 },
  ],
};

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
): BeltLoopEntityIds {
  const maxOffset = options.sideLength - 1;
  const topEdges: TransportBeltEntityId[] = [];
  const rightEdges: TransportBeltEntityId[] = [];
  const bottomEdges: TransportBeltEntityId[] = [];
  const leftEdges: TransportBeltEntityId[] = [];

  const topLeft = spawnTransportBelt(world, {
    x: options.x,
    y: options.y,
    variant: options.topLeft,
  });
  const topRight = spawnTransportBelt(world, {
    x: options.x + maxOffset * BELT_SPACING,
    y: options.y,
    variant: options.topRight,
  });
  const bottomRight = spawnTransportBelt(world, {
    x: options.x + maxOffset * BELT_SPACING,
    y: options.y + maxOffset * BELT_SPACING,
    variant: options.bottomRight,
  });
  const bottomLeft = spawnTransportBelt(world, {
    x: options.x,
    y: options.y + maxOffset * BELT_SPACING,
    variant: options.bottomLeft,
  });

  for (let offset = 1; offset < maxOffset; offset += 1) {
    topEdges.push(spawnTransportBelt(world, {
      x: options.x + offset * (BELT_SPACING),
      y: options.y,
      variant: options.top,
    }));
    rightEdges.push(spawnTransportBelt(world, {
      x: options.x + maxOffset * BELT_SPACING,
      y: options.y + offset * BELT_SPACING,
      variant: options.right,
    }));
    bottomEdges.push(spawnTransportBelt(world, {
      x: options.x + offset * BELT_SPACING,
      y: options.y + maxOffset * BELT_SPACING,
      variant: options.bottom,
    }));
    leftEdges.push(spawnTransportBelt(world, {
      x: options.x,
      y: options.y + offset * BELT_SPACING,
      variant: options.left,
    }));
  }

  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
    topEdges,
    rightEdges,
    bottomEdges,
    leftEdges,
  };
}

function spawnAnimatedTransportLoop(world: UserWorld, loop: BeltLoopEntityIds): void {
  const candidateBelts = [
    loop.topLeft,
    ...loop.topEdges,
    loop.topRight,
    ...loop.rightEdges,
    loop.bottomRight,
    ...loop.bottomEdges,
    loop.bottomLeft,
    ...loop.leftEdges,
  ];

  const placements: ReadonlyArray<readonly [beltEntityId: TransportBeltEntityId, side: ConveyorSide, index: ConveyorSlotIndex]> = [
    [candidateBelts[0], "left", 0],
    [candidateBelts[2], "right", 2],
    [candidateBelts[4], "left", 1],
    [candidateBelts[6], "right", 3],
  ];

  for (const [beltEntityId, side, index] of placements) {
    const gear = spawnGear(world, { size: "large" });
    ConveyorUtils.addEntity(world, beltEntityId, gear, side, index, 0);
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

      function spawnTransportDemo(x: number, y: number, variant: TransportBeltVariant) {
        const demoBelt = spawnTransportBelt(world, {
          x: x,
          y: y,
          variant,
        });

        if (!canConveyorStoreEntities(variant)) {
          return;
        }

        const demoLayout = STRAIGHT_BELT_DEMO_COG_LAYOUTS[variant];

        if (!demoLayout) {
          return;
        }

        for (const placement of demoLayout) {
          const gear = spawnGear(world, { size: "large" });

          ConveyorUtils.addEntity(
            world,
            demoBelt,
            gear,
            placement.side,
            placement.index,
            placement.progress,
          );
        }
      }

      function spawnAnimatedTransportDemoRow(x: number, y: number, variant: TransportBeltVariant) {
        const firstBelt = spawnTransportBelt(world, {
          x,
          y,
          variant,
        });

        spawnTransportBelt(world, {
          x: x + BELT_SPACING,
          y,
          variant,
        });

        spawnTransportBelt(world, {
          x: x + BELT_SPACING * 2,
          y,
          variant,
        });

        spawnTransportBelt(world, {
          x: x + BELT_SPACING * 3,
          y,
          variant,
        });

        if (!canConveyorStoreEntities(variant)) {
          return;
        }

        const leftA = spawnGear(world, { size: "large" });
        const rightA = spawnGear(world, { size: "large" });

        ConveyorUtils.addEntity(world, firstBelt, leftA, "left", 0, 0);
        ConveyorUtils.addEntity(world, firstBelt, rightA, "right", 1, 0);
      }

      const demoGridStartX = -220;
      const demoGridStartY = 540;
      const demoGridColumns = 5;
      const demoGridStep = BELT_SPACING * 2;

      for (const [index, variant] of TRANSPORT_BELT_VARIANTS.entries()) {
        const column = index % demoGridColumns;
        const row = Math.floor(index / demoGridColumns);

        spawnTransportDemo(
          demoGridStartX + column * demoGridStep,
          demoGridStartY + row * demoGridStep,
          variant,
        );
      }

      spawnAnimatedTransportDemoRow(-300, 460, "horizontal-right");

      const xs = Array.from({ length: 5 }, (_, i) => 500 + i * 100);
      const ys = Array.from({ length: 5 }, (_, i) => 60 + i * BELT_SPACING * 2);

      // performance testing (currently ~70-80 fps)
      for (const x of xs) {
        for (const y of ys) {
          spawnTransportDemo(x, y, "horizontal-right");
          spawnTransportDemo(x + 20, y, "horizontal-right");
          spawnTransportDemo(x + 40, y, "horizontal-right");
          spawnTransportDemo(x + 60, y, "horizontal-right");
          spawnTransportDemo(x + 80, y, "horizontal-right");

          spawnTransportDemo(x, y + BELT_SPACING, "horizontal-left");
          spawnTransportDemo(x + 20, y + BELT_SPACING, "horizontal-left");
          spawnTransportDemo(x + 40, y + BELT_SPACING, "horizontal-left");
          spawnTransportDemo(x + 60, y + BELT_SPACING, "horizontal-left");
          spawnTransportDemo(x + 80, y + BELT_SPACING, "horizontal-left");
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

      const clockwiseLoop = spawnBeltLoop(world, {
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

      const counterClockwiseLoop = spawnBeltLoop(world, {
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

      spawnAnimatedTransportLoop(world, clockwiseLoop);
      spawnAnimatedTransportLoop(world, counterClockwiseLoop);
    },
  });
}

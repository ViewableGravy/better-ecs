/**
 * Conveyor Worker Scene — demonstrates the worker-based belt simulation
 * with instanced-bucket rendering.
 *
 * Lays out a loop of belts, places items on them, and renders items
 * through the engine's render pipeline without ECS entities per item.
 * Belts themselves are drawn as ECS AnimatedSprite entities (visuals only).
 */

import { RENDER_LAYERS } from "@client/consts";
import type { TransportBeltVariant } from "@client/entities/transport-belt/consts";
import { createTransportBeltSprite } from "@client/entities/transport-belt/render/createTransportBeltSprite";
import { ConveyorController } from "@client/scenes/conveyor-worker/controller";
import { conveyorPresentation } from "@client/scenes/conveyor-worker/presentation";
import type { Registry } from "@engine";
import { ActiveRegistry, Engine, FromEngine, fromContext } from "@engine/context";
import {
  AnimatedSprite,
  Camera,
  Texture,
  Transform2D,
} from "@engine/components";
import type { BeltVariant } from "@client/scenes/conveyor-worker/types";
import { createScene } from "@engine";

/**********************************************************************************************************
 *   BELT LAYOUT
 *
 *   Builds a rectangular loop of belts:
 *   - Top edge: left-to-right (west→east)
 *   - Right edge: top-to-bottom (north→south)
 *   - Bottom edge: right-to-left (east→west)
 *   - Left edge: bottom-to-top (south→north)
 *   - Curved corners connecting the edges
 **********************************************************************************************************/

const LOOP_WIDTH = 8;
const LOOP_HEIGHT = 4;
const CELL = 20;
const ITEM_SIZE = 10; // pixels

type BeltPlacement = { x: number; y: number; variant?: BeltVariant };

function buildRectangularLoop(): BeltPlacement[] {
  const belts: BeltPlacement[] = [];

  // Top edge
  for (let i = 0; i < LOOP_WIDTH; i++) {
    belts.push({ x: i * CELL, y: 0, variant: "horizontal-right" });
  }
  // Top-right corner
  belts.push({ x: LOOP_WIDTH * CELL, y: 0, variant: "angled-right-bottom" });
  // Right edge
  for (let i = 1; i < LOOP_HEIGHT; i++) {
    belts.push({ x: LOOP_WIDTH * CELL, y: i * CELL, variant: "vertical-down" });
  }
  // Bottom-right corner
  belts.push({ x: LOOP_WIDTH * CELL, y: LOOP_HEIGHT * CELL, variant: "angled-bottom-left" });
  // Bottom edge
  for (let i = LOOP_WIDTH - 1; i >= 0; i--) {
    belts.push({ x: i * CELL, y: LOOP_HEIGHT * CELL, variant: "horizontal-left" });
  }
  // Bottom-left corner
  belts.push({ x: 0, y: LOOP_HEIGHT * CELL, variant: "angled-left-up" });
  // Left edge
  for (let i = LOOP_HEIGHT - 1; i > 0; i--) {
    belts.push({ x: 0, y: i * CELL, variant: "vertical-up" });
  }
  // Top-left corner
  belts.push({ x: 0, y: 0, variant: "angled-up-right" });

  return belts;
}

/**********************************************************************************************************
 *   SCENE
 **********************************************************************************************************/

let cleanup: () => void = () => undefined;

export const Scene = createScene("ConveyorWorkerScene")({
  async setup() {
    const registry = fromContext(ActiveRegistry);
    const engine = fromContext(Engine);
    const assets = fromContext(FromEngine.Assets);

    // Load textures
    await Promise.all([
      assets.loadSheet("iron-gear"),
      assets.loadSheet("transport-belt"),
    ]);

    // Spawn camera centered on the loop
    const loopCenterX = (LOOP_WIDTH * CELL) / 2;
    const loopCenterY = (LOOP_HEIGHT * CELL) / 2;
    spawnLoopCamera(registry, loopCenterX, loopCenterY);

    // Build the belt layout
    const layout = buildRectangularLoop();

    // Spawn belt visuals (ECS entities — sprites only, no simulation)
    for (const belt of layout) {
      spawnBeltVisual(registry, belt.x, belt.y, belt.variant ?? "horizontal-right");
    }

    const itemTexture = assets.getFromSheetStrict("iron-gear", "small");
    if (!(itemTexture instanceof Texture)) {
      throw new Error("iron-gear:small is not a Texture");
    }

    // Create controller with properly sized items
    const controller = new ConveyorController({
      image: itemTexture.source.resource,
      uvRect: createUvRect(itemTexture),
      itemSize: ITEM_SIZE,
    });

    // Register draw callback
    conveyorPresentation.setDraw((renderer) => {
      controller.initializeRenderer(renderer);
      controller.draw(renderer);
    });

    // Start the simulation
    controller.init(layout);

    // Wait for worker initialization
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Place items on the top edge at staggered positions
    const itemCount = Math.min(layout.length / 2, 16);
    for (let i = 0; i < itemCount; i++) {
      const beltIdx = i % LOOP_WIDTH;
      const belt = layout[beltIdx]!;
      const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
      const slot = (i % 4) as 0 | 1 | 2 | 3;

      controller.sendCommands([
        { type: "place-item", beltX: belt.x, beltY: belt.y, side, slotIndex: slot, itemType: "iron-gear:small" },
      ]);
    }

    cleanup = () => {
      controller.dispose();
      conveyorPresentation.clear();
    };
  },
  teardown() {
    cleanup();
    cleanup = () => undefined;
  },
});

/**********************************************************************************************************
 *   HELPERS
 **********************************************************************************************************/

function spawnBeltVisual(
  world: Registry,
  x: number,
  y: number,
  variant: string,
): void {
  const entity = world.create();
  world.add(entity, new Transform2D(x, y, 0));
  const sprite = createTransportBeltSprite(variant as TransportBeltVariant);
  sprite.isDynamic = false;
  sprite.layer = RENDER_LAYERS.belts;
  world.add(entity, sprite);
}

function spawnLoopCamera(
  world: Registry,
  x: number,
  y: number,
): void {
  const entity = world.create();
  world.add(entity, new Transform2D(x, y));
  const camera = new Camera("orthographic", 150);
  camera.primary = true;
  world.add(entity, camera);
}

function createUvRect(texture: Texture): Float32Array {
  const w = texture.frameWidth || texture.source.width;
  const h = texture.frameHeight || texture.source.height;
  const insetX = w > 1 ? 0.5 : 0;
  const insetY = h > 1 ? 0.5 : 0;
  return new Float32Array([
    (texture.frameX + insetX) / texture.source.width,
    (texture.frameY + insetY) / texture.source.height,
    (texture.frameX + w - insetX) / texture.source.width,
    (texture.frameY + h - insetY) / texture.source.height,
  ]);
}

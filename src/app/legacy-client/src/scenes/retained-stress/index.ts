import { RENDER_LAYERS } from "@legacy/consts";
import { createScene } from "@engine";
import { AnimatedSprite, Camera, Transform2D } from "@engine/components";
import { ActiveRegistry, FromEngine, fromContext } from "@engine/context";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Total conveyor belts in the grid. */
const BELT_COUNT = 1_000_000;

/** Grid dimensions — 1000×1000 yields exactly 1 000 000. */
const GRID_COLUMNS = 1000;
const GRID_ROWS = 1000;

/** World-unit spacing between belt centres (also the quad size). */
const BELT_SIZE = 4;

/** Number of entities to spawn per rAF chunk. */
const SPAWN_CHUNK_SIZE = 25_000;

/** Belt animation frames (all share one texture atlas → one retained bucket). */
const BELT_FRAME_COUNT = 16;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBeltFrames(): any[] {
  const frames: string[] = [];
  for (let i = 1; i <= BELT_FRAME_COUNT; i += 1) {
    frames.push(`transport-belt:horizontal-right_${i}` as const);
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export const Scene = createScene("RetainedStressScene")({
  async setup() {
    const registry = fromContext(ActiveRegistry);
    const assets = fromContext(FromEngine.Assets);

    // Load the transport-belt sprite sheet.
    await assets.loadSheet("transport-belt");

    // ---- Camera ----------------------------------------------------------------
    // Spawn a camera that can see the entire grid at once.
    const worldExtent = (GRID_COLUMNS - 1) * BELT_SIZE;
    const orthoSize = Math.ceil(worldExtent / 2) + 100; // small margin

    const cameraEntity = registry.create();
    registry.add(cameraEntity, new Transform2D(0, 0));
    const camera = new Camera("orthographic", orthoSize);
    camera.primary = true;
    registry.add(cameraEntity, camera);

    // ---- Belt spawning (chunked) -----------------------------------------------
    const gridStartX = -(worldExtent) / 2;
    const gridStartY = -(worldExtent) / 2;

    // Pre-compute shared frame asset list once.
    const frameAssetIds = buildBeltFrames();

    let spawned = 0;
    while (spawned < BELT_COUNT) {
      const chunkEnd = Math.min(spawned + SPAWN_CHUNK_SIZE, BELT_COUNT);

      while (spawned < chunkEnd) {
        const col = spawned % GRID_COLUMNS;
        const row = Math.floor(spawned / GRID_COLUMNS);
        const x = gridStartX + col * BELT_SIZE;
        const y = gridStartY + row * BELT_SIZE;

        const entityId = registry.create();
        registry.add(entityId, new Transform2D(x, y));

        // All belts share identical animation data → one retained draw bucket.
        //
        // frameSelectionMode: "shader" means the GPU picks the animation frame from
        // a single per-bucket uniform — the CPU never iterates these entities.
        //
        // isDynamic: false means after initial upload the retained store never
        // re-uploads these instances.
        const sprite = new AnimatedSprite({
          assets: frameAssetIds,
          width: BELT_SIZE,
          height: BELT_SIZE,
          playbackMode: "tick",
          useGlobalOffset: true,
          frameSelectionMode: "shader",
          layer: RENDER_LAYERS.belts,
          playbackRate: 0.5,
          isDynamic: false,
        });

        registry.add(entityId, sprite);
        spawned += 1;
      }

      // Yield to the browser between chunks so the page stays responsive.
      if (spawned < BELT_COUNT) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[RetainedStressScene] Spawned ${BELT_COUNT.toLocaleString()} belts ` +
        `in a ${GRID_COLUMNS}×${GRID_ROWS} grid. ` +
        `Camera orthoSize=${orthoSize}. ` +
        `All belts share 1 retained bucket with GPU-side shader animation.`,
    );
  },
});

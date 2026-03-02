import { RENDER_LAYERS } from "@client/consts";
import { GRID_CELL_SIZE } from "@client/scenes/world/systems/build-mode/const";
import type { UserWorld } from "@engine";
import { Debug, Sprite, Transform2D } from "@engine/components";
import { OUTSIDE, RenderVisibility } from "@client/scenes/world/components/render-visibility";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type SpawnOreFieldOptions = {
  centerX: number;
  centerY: number;
  columns?: number;
  rows?: number;
};

type OreVariant = Sprite["assetId"];

const ORE_BAND_60: OreVariant[] = [
  "iron-ore:60_a",
  "iron-ore:60_b",
  "iron-ore:60_c",
  "iron-ore:60_d",
  "iron-ore:60_e",
  "iron-ore:60_f",
  "iron-ore:60_g",
  "iron-ore:60_h",
];

const ORE_BAND_40: OreVariant[] = [
  "iron-ore:40_a",
  "iron-ore:40_b",
  "iron-ore:40_c",
  "iron-ore:40_d",
  "iron-ore:40_e",
  "iron-ore:40_f",
  "iron-ore:40_g",
  "iron-ore:40_h",
];

const ORE_SPRITE_SIZE = GRID_CELL_SIZE * 1.5;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function spawnOreField(world: UserWorld, options: SpawnOreFieldOptions): void {
  const columns = options.columns ?? 18;
  const rows = options.rows ?? 16;
  const patchWidth = columns * GRID_CELL_SIZE;
  const patchHeight = rows * GRID_CELL_SIZE;
  const startX = options.centerX - patchWidth * 0.5;
  const startY = options.centerY - patchHeight * 0.5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const cellCenterX = startX + col * GRID_CELL_SIZE + GRID_CELL_SIZE * 0.5;
      const cellCenterY = startY + row * GRID_CELL_SIZE + GRID_CELL_SIZE * 0.5;
      const seed = col * 1543 + row * 3181;

      placeOreEntity(world, {
        x: cellCenterX,
        y: cellCenterY,
        row,
        col,
        seed,
      });
    }
  }
}

function placeOreEntity(
  world: UserWorld,
  opts: {
    x: number;
    y: number;
    row: number;
    col: number;
    seed: number;
  },
): void {
  const band = hash01(opts.seed + 1) > 0.5 ? ORE_BAND_60 : ORE_BAND_40;
  const assetId = pickFromBand(band, opts.seed);

  const sprite = new Sprite(assetId, ORE_SPRITE_SIZE, ORE_SPRITE_SIZE);
  sprite.layer = RENDER_LAYERS.ore;
  sprite.zOrder = opts.row;

  const oreEntity = world.create();
  const transform = new Transform2D(opts.x, opts.y, 0);

  world.add(oreEntity, transform);
  world.add(oreEntity, sprite);
  world.add(oreEntity, new RenderVisibility(OUTSIDE, 1));
  world.add(oreEntity, new Debug("ore"));
}

function pickFromBand(band: OreVariant[], seed: number): OreVariant {
  const index = Math.floor(hash01(seed) * band.length) % band.length;
  return band[index];
}

function hash01(seed: number): number {
  const sine = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return sine - Math.floor(sine);
}

import { RENDER_LAYERS } from "@/render/layers";
import { GRID_CELL_SIZE } from "@/scenes/world/systems/build-mode/const";
import type { UserWorld } from "@repo/engine";
import { Debug, Sprite, Transform2D } from "@repo/engine/components";
import { OUTSIDE, RenderVisibility } from "../components/render-visibility";

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

const ORE_BAND_100: OreVariant[] = [
  "iron-ore:100_a",
  "iron-ore:100_b",
  "iron-ore:100_c",
  "iron-ore:100_d",
  "iron-ore:100_e",
  "iron-ore:100_f",
  "iron-ore:100_g",
  "iron-ore:100_h",
];

const ORE_BAND_80: OreVariant[] = [
  "iron-ore:80_a",
  "iron-ore:80_b",
  "iron-ore:80_c",
  "iron-ore:80_d",
  "iron-ore:80_e",
  "iron-ore:80_f",
  "iron-ore:80_g",
  "iron-ore:80_h",
];

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

const ORE_BAND_20: OreVariant[] = [
  "iron-ore:20_a",
  "iron-ore:20_b",
  "iron-ore:20_c",
  "iron-ore:20_d",
  "iron-ore:20_e",
  "iron-ore:20_f",
  "iron-ore:20_g",
  "iron-ore:20_h",
];

const ORE_THRESHOLD = 0.4;
const ORE_SPRITE_SIZE = GRID_CELL_SIZE * 1.5;
const MIN_OFFSET = 0.1 * GRID_CELL_SIZE;
const MAX_OFFSET = 0.3 * GRID_CELL_SIZE;

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
  const field = buildSmoothedField(columns, rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const density = field[row * columns + col];

      if (density < ORE_THRESHOLD) {
        continue;
      }

      const cellCenterX = startX + col * GRID_CELL_SIZE + GRID_CELL_SIZE * 0.5;
      const cellCenterY = startY + row * GRID_CELL_SIZE + GRID_CELL_SIZE * 0.5;
      const richness = normalizeRichness(density);
      const baseSeed = col * 1543 + row * 3181;

      placeOreEntity(world, {
        x: cellCenterX,
        y: cellCenterY,
        row,
        col,
        richness,
        seed: baseSeed,
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
    richness: number;
    seed: number;
  },
): void {
  // Small offset from tile center: magnitude between MIN_OFFSET and MAX_OFFSET
  const offsetMagnitude = lerp(MIN_OFFSET, MAX_OFFSET, hash01(opts.seed + 7));
  const offsetAngle = hash01(opts.seed + 13) * Math.PI * 2;
  const offsetX = Math.cos(offsetAngle) * offsetMagnitude;
  const offsetY = Math.sin(offsetAngle) * offsetMagnitude;

  const rotation = (hash01(opts.seed + 41) - 0.5) * 0.26;
  const assetId = pickOreVariant(opts.col, opts.row, opts.richness, opts.seed);

  const sprite = new Sprite(assetId, ORE_SPRITE_SIZE, ORE_SPRITE_SIZE);
  sprite.layer = RENDER_LAYERS.ore;
  sprite.zOrder = opts.row;

  const oreEntity = world.create();
  const transform = new Transform2D(opts.x + offsetX, opts.y + offsetY, rotation);

  world.add(oreEntity, transform);
  world.add(oreEntity, sprite);
  world.add(oreEntity, new RenderVisibility(OUTSIDE, 1));
  world.add(oreEntity, new Debug("ore"));
}

function pickOreVariant(col: number, row: number, richness: number, seed: number): OreVariant {
  const sampleSeed = seed + col * 173 + row * 227 + 41;

  if (richness > 0.82) {
    return pickFromBand(ORE_BAND_100, sampleSeed);
  }

  if (richness > 0.64) {
    return hash01(sampleSeed + 7) > 0.35
      ? pickFromBand(ORE_BAND_100, sampleSeed)
      : pickFromBand(ORE_BAND_80, sampleSeed + 11);
  }

  if (richness > 0.5) {
    return hash01(sampleSeed + 13) > 0.5
      ? pickFromBand(ORE_BAND_80, sampleSeed)
      : pickFromBand(ORE_BAND_60, sampleSeed + 3);
  }

  if (richness > 0.34) {
    return hash01(sampleSeed + 19) > 0.45
      ? pickFromBand(ORE_BAND_60, sampleSeed)
      : pickFromBand(ORE_BAND_40, sampleSeed + 5);
  }

  return hash01(sampleSeed + 23) > 0.4
    ? pickFromBand(ORE_BAND_40, sampleSeed)
    : pickFromBand(ORE_BAND_20, sampleSeed + 9);
}

function pickFromBand(band: OreVariant[], seed: number): OreVariant {
  const index = Math.floor(hash01(seed) * band.length) % band.length;
  return band[index];
}

function normalizeRichness(density: number): number {
  const normalized = (density - ORE_THRESHOLD) / (1 - ORE_THRESHOLD);
  return clamp01(normalized);
}

function buildSmoothedField(columns: number, rows: number): Float32Array {
  const field = new Float32Array(columns * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const normalizedX = col / (columns - 1) - 0.5;
      const normalizedY = row / (rows - 1) - 0.5;
      const radialDistance = Math.sqrt(
        (normalizedX * normalizedX) / 0.34 + (normalizedY * normalizedY) / 0.24,
      );
      const radial = clamp01(1 - radialDistance);
      const detail = valueNoise2D(col * 0.28, row * 0.28, 91);
      const macro = valueNoise2D(col * 0.14, row * 0.14, 211);
      const shape = radial * 0.68 + detail * 0.2 + macro * 0.12;

      field[row * columns + col] = shape;
    }
  }

  smoothField(field, columns, rows, 2);
  return field;
}

function smoothField(field: Float32Array, columns: number, rows: number, iterations: number): void {
  const scratch = new Float32Array(field.length);

  for (let iteration = 0; iteration < iterations; iteration++) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        let sum = 0;
        let weight = 0;

        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const sampleCol = col + ox;
            const sampleRow = row + oy;
            if (sampleCol < 0 || sampleCol >= columns || sampleRow < 0 || sampleRow >= rows) {
              continue;
            }

            const kernel = ox === 0 && oy === 0 ? 2 : 1;
            sum += field[sampleRow * columns + sampleCol] * kernel;
            weight += kernel;
          }
        }

        scratch[row * columns + col] = sum / weight;
      }
    }

    field.set(scratch);
  }
}

function hash01(seed: number): number {
  const sine = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return sine - Math.floor(sine);
}

function valueNoise2D(x: number, y: number, seedOffset: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const sx = smoothStep01(x - x0);
  const sy = smoothStep01(y - y0);

  const n00 = hash01(x0 * 92821 + y0 * 68917 + seedOffset);
  const n10 = hash01(x1 * 92821 + y0 * 68917 + seedOffset);
  const n01 = hash01(x0 * 92821 + y1 * 68917 + seedOffset);
  const n11 = hash01(x1 * 92821 + y1 * 68917 + seedOffset);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
}

function smoothStep01(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

import gridIndexFragmentSource from "@client/assets/debug-grid/grid-index.frag";
import gridIndexVertexSource from "@client/assets/debug-grid/grid-index.vert";
import { SQRT_3 } from "@client/render/passes/world.terrain/consts";
import type { TerrainDataStoreRuntime } from "@client/systems/terrain";
import { TERRAIN_CHUNK_SIZE } from "@client/systems/terrain/const";
import { Grid } from "@client/utilities/grid";
import type { InstancedBucket, Renderer } from "@engine/render";
import invariant from "tiny-invariant";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type GridIndexRenderer = Pick<
  Renderer,
  | "createInstancedBucket"
  | "drawInstancedBucket"
  | "getCameraX"
  | "getCameraY"
  | "getCameraZoom"
  | "getWidth"
  | "getHeight"
>;

type TerrainReader = Pick<TerrainDataStoreRuntime, "chunks" | "revision">;

type GlyphAtlas = {
  readonly canvas: HTMLCanvasElement;
  readonly advance: number;
  readonly width: number;
  readonly height: number;
  readonly uStep: number;
};

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const GLYPH_CHARACTERS = "0123456789-(),";
const FONT_FAMILY = "monospace";
const FONT_WEIGHT = "700";
const GRID_INDEX_FONT_SIZE = 14;
const TEXT_RASTER_SCALE = 4;
const ATLAS_PADDING = 2;
const INSTANCE_FLOATS = 8;
const INITIAL_INSTANCE_CAPACITY = 1024;
const GRID_INDEX_COLOR = "white";

/**********************************************************************************************************
 *   CLASS START
 **********************************************************************************************************/
/** Renders dense numeric grid labels from one immutable glyph atlas and one instanced draw. */
export class GridIndexRenderCache {
  readonly #labels = new Map<number, Map<number, string>>();
  #instanceData = new Float32Array(INITIAL_INSTANCE_CAPACITY * INSTANCE_FLOATS);
  #instanceCount = 0;
  #terrainRevision = -1;
  #gridRadius = Number.NaN;
  #bucket: InstancedBucket | undefined;
  #atlas: GlyphAtlas | undefined;

  public draw(renderer: GridIndexRenderer, terrain: TerrainReader): void {
    const bucket = this.#bucket ?? this.#createBucket(renderer);
    const atlas = this.#atlas;
    invariant(atlas, "Grid index glyph atlas must exist after creating its render bucket");

    if (this.#terrainRevision !== terrain.revision || this.#gridRadius !== Grid.radius) {
      this.#rebuildInstances(terrain, atlas);
      bucket.setData(this.#instanceData, this.#instanceCount);
      this.#terrainRevision = terrain.revision;
      this.#gridRadius = Grid.radius;
    }

    return void renderer.drawInstancedBucket(bucket);
  }

  #rebuildInstances(terrain: TerrainReader, atlas: GlyphAtlas): void {
    this.#instanceCount = 0;

    for (const chunk of terrain.chunks.values()) {
      for (let localY = 0; localY < TERRAIN_CHUNK_SIZE; localY += 1) {
        for (let localX = 0; localX < TERRAIN_CHUNK_SIZE; localX += 1) {
          const cell = chunk.cells[localY * TERRAIN_CHUNK_SIZE + localX];
          if (!cell) {
            continue;
          }

          const gridX = chunk.x * TERRAIN_CHUNK_SIZE + localX;
          const gridY = chunk.y * TERRAIN_CHUNK_SIZE + localY;
          this.#writeLabel(gridX, gridY, atlas);
        }
      }
    }
  }

  #writeLabel(gridX: number, gridY: number, atlas: GlyphAtlas): void {
    const worldX = Grid.radius * 1.5 * gridX;
    const worldY = Grid.radius * SQRT_3 * (gridX * 0.5 + gridY);
    const label = this.#getLabel(gridX, gridY);
    const startX = worldX - label.length * atlas.advance * 0.5;
    this.#ensureInstanceCapacity(this.#instanceCount + label.length);

    for (let characterIndex = 0; characterIndex < label.length; characterIndex += 1) {
      const characterCode = label.charCodeAt(characterIndex);
      if (characterCode === 32) {
        continue;
      }

      const glyphIndex = requireGlyphIndex(characterCode, label);
      const instanceOffset = this.#instanceCount * INSTANCE_FLOATS;
      const u0 = glyphIndex * atlas.uStep;
      this.#instanceData[instanceOffset] = startX + atlas.advance * (characterIndex + 0.5);
      this.#instanceData[instanceOffset + 1] = worldY - atlas.height * 0.5;
      this.#instanceData[instanceOffset + 2] = atlas.width;
      this.#instanceData[instanceOffset + 3] = atlas.height;
      this.#instanceData[instanceOffset + 4] = u0;
      this.#instanceData[instanceOffset + 5] = 0;
      this.#instanceData[instanceOffset + 6] = u0 + atlas.uStep;
      this.#instanceData[instanceOffset + 7] = 1;
      this.#instanceCount += 1;
    }
  }

  #createBucket(renderer: GridIndexRenderer): InstancedBucket {
    const atlas = createGlyphAtlas();
    this.#atlas = atlas;
    this.#bucket = renderer.createInstancedBucket({
      vertexSource: gridIndexVertexSource,
      fragmentSource: gridIndexFragmentSource,
      attributes: [
        { location: 1, size: 2, offset: 0 },
        { location: 2, size: 2, offset: 2 * Float32Array.BYTES_PER_ELEMENT },
        { location: 3, size: 4, offset: 4 * Float32Array.BYTES_PER_ELEMENT },
      ],
      stride: INSTANCE_FLOATS * Float32Array.BYTES_PER_ELEMENT,
      uniformNames: ["uViewport", "uCameraPosition", "uCameraZoom", "uTexture"],
      textureSource: atlas.canvas,
    });
    return this.#bucket;
  }

  #ensureInstanceCapacity(requiredCapacity: number): void {
    const currentCapacity = this.#instanceData.length / INSTANCE_FLOATS;
    if (requiredCapacity <= currentCapacity) {
      return;
    }

    const nextCapacity = Math.max(requiredCapacity, currentCapacity * 2);
    const nextData = new Float32Array(nextCapacity * INSTANCE_FLOATS);
    nextData.set(this.#instanceData);
    this.#instanceData = nextData;
  }

  #getLabel(gridX: number, gridY: number): string {
    let labelsByY = this.#labels.get(gridX);
    if (!labelsByY) {
      labelsByY = new Map();
      this.#labels.set(gridX, labelsByY);
    }

    const existing = labelsByY.get(gridY);
    if (existing) {
      return existing;
    }

    const label = `(${gridX}, ${gridY})`;
    labelsByY.set(gridY, label);
    return label;
  }
}

function createGlyphAtlas(): GlyphAtlas {
  const canvas = document.createElement("canvas");
  const measurementContext = canvas.getContext("2d");
  invariant(measurementContext, "Failed to get grid index glyph measurement context");

  const rasterFontSize = GRID_INDEX_FONT_SIZE * TEXT_RASTER_SCALE;
  const font = `${FONT_WEIGHT} ${rasterFontSize}px ${FONT_FAMILY}`;
  measurementContext.font = font;
  const metrics = measurementContext.measureText("M");
  const ascent = metrics.actualBoundingBoxAscent || rasterFontSize;
  const descent = metrics.actualBoundingBoxDescent || rasterFontSize * 0.2;
  const advancePixels = Math.max(1, Math.ceil(metrics.width));
  const cellWidth = advancePixels + ATLAS_PADDING * 2;
  const cellHeight = Math.max(1, Math.ceil(ascent + descent)) + ATLAS_PADDING * 2;

  canvas.width = cellWidth * GLYPH_CHARACTERS.length;
  canvas.height = cellHeight;

  const context = canvas.getContext("2d");
  invariant(context, "Failed to get grid index glyph rendering context");
  context.font = font;
  context.fillStyle = GRID_INDEX_COLOR;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  for (let index = 0; index < GLYPH_CHARACTERS.length; index += 1) {
    context.fillText(
      GLYPH_CHARACTERS.charAt(index),
      index * cellWidth + ATLAS_PADDING,
      ATLAS_PADDING + ascent,
    );
  }

  return {
    canvas,
    advance: advancePixels / TEXT_RASTER_SCALE,
    width: cellWidth / TEXT_RASTER_SCALE,
    height: cellHeight / TEXT_RASTER_SCALE,
    uStep: 1 / GLYPH_CHARACTERS.length,
  };
}

function requireGlyphIndex(characterCode: number, label: string): number {
  if (characterCode >= 48 && characterCode <= 57) {
    return characterCode - 48;
  }

  if (characterCode === 45) {
    return 10;
  }

  if (characterCode === 40) {
    return 11;
  }

  if (characterCode === 41) {
    return 12;
  }

  if (characterCode === 44) {
    return 13;
  }

  throw new Error(`Unsupported grid index glyph in "${label}"`);
}

import baseFragmentSource from "@client/assets/terrain/base.frag";
import terrainVertexSource from "@client/assets/terrain/terrain.vert";
import type { TerrainSystemRuntime } from "@client/systems/terrain";
import { TERRAIN_CHUNK_SIZE } from "@client/systems/terrain/const";
import type { TerrainChunk, TerrainKind } from "@client/systems/terrain/types";
import { Grid } from "@client/utilities/grid";
import type { InstancedBucket, InstancedBucketDescriptor, Renderer } from "@engine/render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ChunkRenderData = {
  readonly base: Float32Array;
};

const SQRT_3 = Math.sqrt(3);
const BASE_STRIDE = 8;
const TERRAIN_COLORS: Record<TerrainKind, readonly [number, number, number, number]> = {
  grass: [0.22, 0.58, 0.24, 1],
  ice: [0.82, 0.92, 0.98, 1],
  water: [0.12, 0.38, 0.78, 1],
};

const baseDescriptor: InstancedBucketDescriptor = {
  vertexSource: terrainVertexSource,
  fragmentSource: baseFragmentSource,
  attributes: [
    { location: 1, size: 2, offset: 0 },
    { location: 2, size: 2, offset: 8 },
    { location: 3, size: 4, offset: 16 },
  ],
  stride: BASE_STRIDE * Float32Array.BYTES_PER_ELEMENT,
  uniformNames: ["uViewport", "uCameraPosition", "uCameraZoom"],
};

const concatBuffers = (buffers: readonly Float32Array[]): Float32Array<ArrayBuffer> => {
  const result = new Float32Array<ArrayBuffer>(
    new ArrayBuffer(buffers.reduce((length, buffer) => length + buffer.length, 0) * Float32Array.BYTES_PER_ELEMENT),
  );
  let offset = 0;

  for (const buffer of buffers) {
    result.set(buffer, offset);
    offset += buffer.length;
  }

  return result;
};

const getWorldPosition = (x: number, y: number): readonly [number, number] => [
  Grid.radius * 1.5 * x,
  Grid.radius * SQRT_3 * (x * 0.5 + y),
];

const createChunkRenderData = (chunk: TerrainChunk): ChunkRenderData => {
  const base: number[] = [];

  for (let localY = 0; localY < TERRAIN_CHUNK_SIZE; localY += 1) {
    for (let localX = 0; localX < TERRAIN_CHUNK_SIZE; localX += 1) {
      const cell = chunk.cells[localY * TERRAIN_CHUNK_SIZE + localX];
      if (!cell) continue;

      const [worldX, worldY] = getWorldPosition(
        chunk.x * TERRAIN_CHUNK_SIZE + localX,
        chunk.y * TERRAIN_CHUNK_SIZE + localY,
      );
      const color = TERRAIN_COLORS[cell.kind];
      base.push(worldX, worldY, Grid.radius * 2.12, Grid.radius * SQRT_3 * 1.06, ...color);
    }
  }

  return {
    base: new Float32Array(base),
  };
};

export class TerrainRenderCache {
  readonly #chunkData = new Map<string, ChunkRenderData>();
  #baseBucket: InstancedBucket | undefined;
  #baseData = new Float32Array();
  #dirty = true;

  draw(renderer: Renderer, terrain: TerrainSystemRuntime): void {
    this.#baseBucket ??= renderer.createInstancedBucket(baseDescriptor);

    if (terrain.dirtyChunks.length > 0) {
      for (const chunk of terrain.dirtyChunks) {
        this.#chunkData.set(`${chunk.x}:${chunk.y}`, createChunkRenderData(chunk));
      }
      terrain.clearDirtyChunks();
      this.#dirty = true;
    }

    if (this.#dirty) {
      const chunks = [...this.#chunkData.values()];
      this.#baseData = concatBuffers(chunks.map((chunk) => chunk.base));
      this.#baseBucket.setData(this.#baseData, this.#baseData.length / BASE_STRIDE);
      this.#dirty = false;
    }

    const camera = {
      x: renderer.getCameraX(),
      y: renderer.getCameraY(),
      zoom: renderer.getCameraZoom(),
      viewportWidth: renderer.getWidth(),
      viewportHeight: renderer.getHeight(),
    };
    renderer.drawInstancedBucket(this.#baseBucket, camera);
  }
}

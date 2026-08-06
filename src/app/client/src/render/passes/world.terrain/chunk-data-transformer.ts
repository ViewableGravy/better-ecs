import { SQRT_3, TERRAIN_COLORS } from "@client/render/passes/world.terrain/consts";
import { TERRAIN_CHUNK_SIZE } from "@client/systems/terrain/const";
import type { TerrainChunk } from "@client/systems/terrain/types";
import { Grid } from "@client/utilities/grid";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type ChunkRenderData = {
  readonly base: Float32Array;
};

/**********************************************************************************************************
 *   CLASS START
 **********************************************************************************************************/
export class ChunkDataTransformer {
  public transform(chunk: TerrainChunk): ChunkRenderData {
    const base: number[] = [];

    for (let localY = 0; localY < TERRAIN_CHUNK_SIZE; localY += 1) {
      for (let localX = 0; localX < TERRAIN_CHUNK_SIZE; localX += 1) {
        const cell = chunk.cells[localY * TERRAIN_CHUNK_SIZE + localX];
        if (!cell) continue;

        const [worldX, worldY] = Grid.getWorldCoordinates(
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
  }
}

import baseFragmentSource from "@client/assets/terrain/base.frag";
import terrainVertexSource from "@client/assets/terrain/terrain.vert";
import { BASE_STRIDE } from "@client/render/passes/world.terrain/consts";
import { TerrainDataBuffer } from "@client/render/passes/world.terrain/dataBuffer";
import type { TerrainDataStoreRuntime } from "@client/systems/terrain";
import type { InstancedBucket, Renderer } from "@engine/render";

/**********************************************************************************************************
 *   CLASS START
 **********************************************************************************************************/
export class TerrainRenderCache {
  readonly #dataBuffer = new TerrainDataBuffer();
  #baseBucket: InstancedBucket | undefined;
  #baseData = new Float32Array();

  public draw(renderer: Renderer, terrain: TerrainDataStoreRuntime): void {
    // Set the bucket during first render, future renders will reuse the bucket.
    this.#baseBucket ??= renderer.createInstancedBucket({
      vertexSource: terrainVertexSource,
      fragmentSource: baseFragmentSource,
      attributes: [
        { location: 1, size: 2, offset: 0 },
        { location: 2, size: 2, offset: 8 },
        { location: 3, size: 4, offset: 16 },
      ],
      stride: BASE_STRIDE * Float32Array.BYTES_PER_ELEMENT,
      uniformNames: ["uViewport", "uCameraPosition", "uCameraZoom"],
    });

    // Collect dirty chunks and refresh their render data.
    if (terrain.dirtyChunks.length) {
      for (const chunk of terrain.dirtyChunks) {
        this.#dataBuffer.setChunk(chunk);
      }

      terrain.clearDirtyChunks();
    }

    // Update buffers if dirty, otherwise reuse existing buffer.
    if (this.#dataBuffer.isDirty()) {
      this.#baseData = this.#dataBuffer.concatBuffers();

      this.#baseBucket.setData(this.#baseData, this.#baseData.length / BASE_STRIDE);
      this.#dataBuffer.clearDirty();
    }

    renderer.drawInstancedBucket(this.#baseBucket);
  }
}

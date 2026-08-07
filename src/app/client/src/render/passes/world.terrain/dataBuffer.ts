import {
    TerrainDataTransformer,
    type TerrainRenderData,
} from "@client/render/passes/world.terrain/dataTransformer";
import type { TerrainChunk } from "@client/systems/terrain/types";

/**********************************************************************************************************
 *   CLASS START
 **********************************************************************************************************/
export class TerrainDataBuffer {
  #chunkData = new Map<string, TerrainRenderData>();
  readonly #transformer = new TerrainDataTransformer();
  #dirty = true;

  public setChunk(chunk: TerrainChunk): void {
    this.#chunkData.set(`${chunk.x}:${chunk.y}`, this.#transformer.transform(chunk));
    this.#dirty = true;
  }

  public concatBuffers(): Float32Array<ArrayBuffer> {
    const buffers = [...this.#chunkData.values()].map((chunk) => chunk.base);
    const combinedBufferLength = buffers.reduce((length, buffer) => length + buffer.length, 0);
    const result = new Float32Array<ArrayBuffer>(
      new ArrayBuffer(combinedBufferLength * Float32Array.BYTES_PER_ELEMENT),
    );

    let offset = 0;

    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }

    return result;
  }

  public isDirty(): boolean {
    return this.#dirty;
  }

  public clearDirty(): void {
    this.#dirty = false;
  }
}

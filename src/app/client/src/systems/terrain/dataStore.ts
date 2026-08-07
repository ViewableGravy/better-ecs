import { TERRAIN_CHUNK_SIZE, TERRAIN_GENERATION_RADIUS } from "@client/systems/terrain/const";
import type { TerrainCell, TerrainChunk } from "@client/systems/terrain/types";
import {
    deriveChunkCoordinate,
    deriveChunkKey,
    deriveLocalCoordinate,
    deriveTerrainKind,
    deriveTerrainNoise,
    getChunkCell,
    setChunkCell,
} from "@client/systems/terrain/utilities";
import { createSystem } from "@engine";

type TerrainState = {
  readonly chunks: Map<string, TerrainChunk>;
  readonly dirtyChunks: TerrainChunk[];
  readonly dirtyChunkKeys: Set<string>;
};

const state: TerrainState = {
  chunks: new Map(),
  dirtyChunks: [],
  dirtyChunkKeys: new Set(),
};

const createChunk = (x: number, y: number): TerrainChunk => ({
  x,
  y,
  cells: Array.from({ length: TERRAIN_CHUNK_SIZE * TERRAIN_CHUNK_SIZE }),
});

const requireChunk = (x: number, y: number): TerrainChunk => {
  const key = deriveChunkKey(x, y);
  const existingChunk = state.chunks.get(key);
  if (existingChunk) return existingChunk;

  const chunk = createChunk(x, y);
  state.chunks.set(key, chunk);
  return chunk;
};

const markChunkDirty = (chunk: TerrainChunk): void => {
  const key = deriveChunkKey(chunk.x, chunk.y);
  if (state.dirtyChunkKeys.has(key)) return;

  state.dirtyChunkKeys.add(key);
  state.dirtyChunks.push(chunk);
};

const markCellDirty = (x: number, y: number): void => {
  markChunkDirty(requireChunk(deriveChunkCoordinate(x), deriveChunkCoordinate(y)));
};

const getCell = (x: number, y: number): TerrainCell | undefined => {
  const chunkX = deriveChunkCoordinate(x);
  const chunkY = deriveChunkCoordinate(y);
  const chunk = state.chunks.get(deriveChunkKey(chunkX, chunkY));
  if (!chunk) return undefined;

  return getChunkCell(
    chunk,
    deriveLocalCoordinate(x, chunkX),
    deriveLocalCoordinate(y, chunkY),
  );
};

const setCell = (x: number, y: number, cell: TerrainCell): void => {
  const chunkX = deriveChunkCoordinate(x);
  const chunkY = deriveChunkCoordinate(y);
  const chunk = requireChunk(chunkX, chunkY);
  setChunkCell(chunk, deriveLocalCoordinate(x, chunkX), deriveLocalCoordinate(y, chunkY), cell);
  markCellDirty(x, y);
};

const generate = (): void => {
  for (let y = -TERRAIN_GENERATION_RADIUS; y <= TERRAIN_GENERATION_RADIUS; y += 1) {
    for (let x = -TERRAIN_GENERATION_RADIUS; x <= TERRAIN_GENERATION_RADIUS; x += 1) {
      setCell(x, y, { kind: deriveTerrainKind(deriveTerrainNoise(x, y)) });
    }
  }
};

export const TerrainDataStore = createSystem("world:terrain")({
  state,
  initialize: generate,
  system: () => void 0,
  methods: () => ({
    getCell,
    setCell,
    get chunks(): ReadonlyMap<string, TerrainChunk> {
      return state.chunks;
    },
    get dirtyChunks(): readonly TerrainChunk[] {
      return state.dirtyChunks;
    },
    clearDirtyChunks(): void {
      for (const chunk of state.dirtyChunks) {
        state.dirtyChunkKeys.delete(deriveChunkKey(chunk.x, chunk.y));
      }
      state.dirtyChunks.length = 0;
    },
  }),
});

export type TerrainDataStoreRuntime = ReturnType<typeof TerrainDataStore>;

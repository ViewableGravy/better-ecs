import { TERRAIN_CHUNK_SIZE } from "@client/systems/terrain/const";
import type { TerrainCell, TerrainChunk, TerrainKind } from "@client/systems/terrain/types";

export const deriveChunkCoordinate = (coordinate: number): number => Math.floor(coordinate / TERRAIN_CHUNK_SIZE);

export const deriveLocalCoordinate = (coordinate: number, chunkCoordinate: number): number =>
  coordinate - chunkCoordinate * TERRAIN_CHUNK_SIZE;

export const deriveChunkKey = (x: number, y: number): string => `${x}:${y}`;

export const deriveChunkCellIndex = (localX: number, localY: number): number =>
  localY * TERRAIN_CHUNK_SIZE + localX;

export const getChunkCell = (chunk: TerrainChunk, localX: number, localY: number): TerrainCell | undefined =>
  chunk.cells[deriveChunkCellIndex(localX, localY)];

export const setChunkCell = (chunk: TerrainChunk, localX: number, localY: number, cell: TerrainCell): void => {
  chunk.cells[deriveChunkCellIndex(localX, localY)] = cell;
};

const hash = (x: number, y: number, seed: number): number => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
};

const smooth = (value: number): number => value * value * (3 - 2 * value);

export const deriveTerrainNoise = (x: number, y: number): number => {
  const sampleX = x / 8;
  const sampleY = y / 8;
  const baseX = Math.floor(sampleX);
  const baseY = Math.floor(sampleY);
  const fractionX = smooth(sampleX - baseX);
  const fractionY = smooth(sampleY - baseY);
  const top = hash(baseX, baseY, 17) * (1 - fractionX) + hash(baseX + 1, baseY, 17) * fractionX;
  const bottom = hash(baseX, baseY + 1, 17) * (1 - fractionX) + hash(baseX + 1, baseY + 1, 17) * fractionX;

  return top * (1 - fractionY) + bottom * fractionY;
};

export const deriveTerrainKind = (noise: number): TerrainKind => {
  if (noise < 0.1) return "water";
  if (noise < 0.8) return "grass";
  return "ice";
};

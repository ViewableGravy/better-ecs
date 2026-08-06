export type TerrainKind = "grass" | "ice" | "water";

export type TerrainCell = {
  kind: TerrainKind;
};

export type TerrainChunk = {
  readonly x: number;
  readonly y: number;
  readonly cells: Array<TerrainCell | undefined>;
};

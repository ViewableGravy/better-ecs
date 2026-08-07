import type { TerrainRenderCache } from "@client/render/passes/world.terrain/renderCache";

export type RenderState = {
  readonly terrainRenderCache: TerrainRenderCache;
};

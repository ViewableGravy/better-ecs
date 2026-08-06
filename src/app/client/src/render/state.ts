import type { TerrainRenderCache } from "@client/render/passes/world.terrain/terrain-render-cache";

export type RenderState = {
  readonly terrain: TerrainRenderCache;
};

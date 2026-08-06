import type { TerrainRenderCache } from "@client/render/passes/world.terrain/utilities";

export type RenderState = {
  readonly terrain: TerrainRenderCache;
};

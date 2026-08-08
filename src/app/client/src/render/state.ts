import type {
  GridIndexRenderCache,
} from "@client/render/passes/debug.draw-grid-indices/grid-index-render-cache";
import type { TerrainRenderCache } from "@client/render/passes/world.terrain/renderCache";

export type RenderState = {
  readonly gridIndexRenderCache: GridIndexRenderCache;
  readonly terrainRenderCache: TerrainRenderCache;
};

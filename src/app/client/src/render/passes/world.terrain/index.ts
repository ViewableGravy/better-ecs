import type { RenderState } from "@client/render/state";
import { createRenderPass, type RenderPassContext } from "@engine";
import { System, fromContext } from "@engine/context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type TerrainRenderState = RenderState;
type TerrainRenderContext = RenderPassContext & {
  readonly state: TerrainRenderState;
};

/**********************************************************************************************************
 *   RENDER PASS
 **********************************************************************************************************/
export const TerrainPass = createRenderPass("world:terrain")({
  execute({ renderer, state }: TerrainRenderContext) {
    const terrain = fromContext(System("world:terrain"));
    state.terrainRenderCache.draw(renderer, terrain);
  },
});

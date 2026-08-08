import type { RenderState } from "@client/render/state";
import { Grid } from "@client/utilities/grid";
import { createRenderPass, type RenderPassContext } from "@engine";
import { fromContext, System } from "@engine/context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type GridIndexRenderContext = RenderPassContext & {
  readonly state: RenderState;
};

/**********************************************************************************************************
 *   PASS START
 **********************************************************************************************************/
export const DrawGridIndicesPass = createRenderPass("debug:grid-indices")({
  execute({ renderer, state }: GridIndexRenderContext) {
    if (!Grid.outlineDebuggingEnabled) {
      return;
    }

    state.gridIndexRenderCache.draw(renderer, fromContext(System("world:terrain")));
  },
});

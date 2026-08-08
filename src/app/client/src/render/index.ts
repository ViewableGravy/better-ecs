import { FPSPass } from "@client/plugins/fps";
import { DrawGridPass } from "@client/render/passes/debug.draw-grid";
import { DrawGridIndicesPass } from "@client/render/passes/debug.draw-grid-indices";
import { GridIndexRenderCache } from "@client/render/passes/debug.draw-grid-indices/grid-index-render-cache";
import { TerrainPass, type TerrainRenderState } from "@client/render/passes/world.terrain";
import { TerrainRenderCache } from "@client/render/passes/world.terrain/renderCache";
import type { CreateRenderPipelineContext } from "@engine";
import { createRenderPipeline } from "@engine";
import { FromEngine, fromContext } from "@engine/context";
import {
    DEFAULT_RENDERER_CONFIG,
    FrameAllocator,
    Renderer2D,
    WebGLRenderAPI,
    type EngineFrameAllocatorRegistry,
} from "@engine/render";

export const Render = createRenderPipeline<EngineFrameAllocatorRegistry, TerrainRenderState>({
  async initializeContext(): Promise<CreateRenderPipelineContext<TerrainRenderState>> {
    const assets = fromContext(FromEngine.Assets);
    const { canvas } = fromContext(FromEngine.Engine);
    const renderer = new Renderer2D(new WebGLRenderAPI(assets), DEFAULT_RENDERER_CONFIG);
    await renderer.initialize(canvas, assets);

    return {
      renderer,
      frameAllocator: new FrameAllocator(),
      state: {
        gridIndexRenderCache: new GridIndexRenderCache(),
        terrainRenderCache: new TerrainRenderCache(),
      },
    };
  },
  beforeWorldPasses: [TerrainPass, DrawGridPass, DrawGridIndicesPass],
  afterWorldPasses: [FPSPass],
});

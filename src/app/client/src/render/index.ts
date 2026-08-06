import { FPSPass } from "@client/plugins/fps";
import { DrawGridPass } from "@client/render/passes/debug.draw-grid";
import { TerrainPass, type TerrainRenderState } from "@client/render/passes/world.terrain";
import { TerrainRenderCache } from "@client/render/passes/world.terrain/terrain-render-cache";
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
        terrain: new TerrainRenderCache(),
      },
    };
  },
  beforeWorldPasses: [TerrainPass, DrawGridPass],
  afterWorldPasses: [FPSPass],
});

import { FPSPass } from "@client/plugins/fps";
import { DrawGridPass } from "@client/render/passes/draw-grid-pass";
import { createRenderPipeline, type CreateRenderPipelineContext } from "@engine";
import { FromEngine, fromContext } from "@engine/context";
import { DEFAULT_RENDERER_CONFIG, FrameAllocator, Renderer2D, WebGLRenderAPI } from "@engine/render";

export const Render = createRenderPipeline({
  async initializeContext(): Promise<CreateRenderPipelineContext> {
    const assets = fromContext(FromEngine.Assets);
    const { canvas } = fromContext(FromEngine.Engine);
    const renderer = new Renderer2D(new WebGLRenderAPI(assets), DEFAULT_RENDERER_CONFIG);
    await renderer.initialize(canvas, assets);

    return {
      renderer,
      frameAllocator: new FrameAllocator(),
    };
  },
  passes: [DrawGridPass],
  afterWorldPasses: [FPSPass],
});

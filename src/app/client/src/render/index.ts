import { FPSPass } from "@client/plugins/fps";
import { ApplyContextVisualsPass } from "@client/render/passes/ApplyContextVisualsPass";
import { DrawGridPass } from "@client/render/passes/DrawGridPass";
import { ActiveWorldProvider } from "@client/render/world-provider";
import { createRenderPipeline, type CreateRenderPipelineContext } from "@engine";
import { fromContext, FromEngine } from "@engine/context";
import {
  DEFAULT_RENDERER_CONFIG,
  FrameAllocator,
  Renderer2D,
  WebGLRenderAPI,
} from "@engine/render";

export const Render = createRenderPipeline({
  async initializeContext(): Promise<CreateRenderPipelineContext> {
    const assets = fromContext(FromEngine.Assets);
    const { canvas } = fromContext(FromEngine.Engine);

    // load shaders used by render pass
    await assets.load("editor:demo-quad-shader");

    const renderer = new Renderer2D(
      new WebGLRenderAPI(assets),
      DEFAULT_RENDERER_CONFIG,
    );

    // initialize the renderer to compile shaders and warm up pipelines before the first frame
    await renderer.initialize(canvas, assets);

    return {
      renderer,
      worldProvider: new ActiveWorldProvider(),
      frameAllocator: new FrameAllocator(),
    };
  },
  passes: [
    ApplyContextVisualsPass,
    DrawGridPass,
  ],
  afterWorldPasses: [
    FPSPass,
  ],
});

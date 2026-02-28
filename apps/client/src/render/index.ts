import { FPSPass } from "@/plugins/fps";
import { createRenderPipeline, type CreateRenderPipelineContext } from "@repo/engine";
import { fromContext, FromEngine } from "@repo/engine/context";
import {
  DEFAULT_RENDERER_CONFIG,
  FrameAllocator,
  Renderer2D,
  WebGLRenderAPI,
} from "@repo/engine/render";
import { ApplyContextVisualsPass } from "./passes/ApplyContextVisualsPass";
import { DrawGridPass } from "./passes/DrawGridPass";
import { ActiveWorldProvider } from "./world-provider";

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

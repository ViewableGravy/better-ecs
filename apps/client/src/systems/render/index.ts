import { FPSPass } from "@/plugins/fps";
import { createRenderPipeline } from "@repo/engine";
import {
  DEFAULT_RENDERER_CONFIG,
  FrameAllocator,
  Renderer2D,
  WebGLRenderAPI,
} from "@repo/engine/render";
import { ApplyContextVisualsPass } from "./passes/ApplyContextVisualsPass";
import { DrawCustomShaderQuadPass } from "./passes/DrawCustomShaderQuadPass";
import { DrawGridPass } from "./passes/DrawGridPass";
import { ActiveWorldProvider } from "./world-provider";

export const Render = createRenderPipeline({
  async initializeContext({ canvas, assets }) {
    await assets.loadLoose("editor:demo-quad-shader");

    const renderer = new Renderer2D(
      new WebGLRenderAPI(assets),
      DEFAULT_RENDERER_CONFIG,
    );

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
    DrawCustomShaderQuadPass,
  ],
  afterWorldPasses: [
    FPSPass,
  ],
});

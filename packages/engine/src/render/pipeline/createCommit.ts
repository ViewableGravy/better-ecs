import { Shape } from "../../components/shape";
import { Sprite } from "../../components/sprite";
import { Transform2D } from "../../components/transform/transform2d";
import { useOverloadedSystem, useWorld } from "../../core/context";
import type { RenderPipelineContext } from "../../core/render-pipeline";

// TODO: I doubt this should be here in the standard context. I suspect that the
// reasonable approach would be to define an options object that can be passed
// instead of just a callback for a custom commit.
// We may also need to consider how a "Camera" (which would likely be attached to an entity)
// in our system, would natively interact with the render pipeline, as passing a view
// is not ideal.
// alpha and clearColor should be default settings on the commit stage for now
// since they are likely temporary while using a canvas renderer
export interface StandardRenderContext {
  view?: { x: number; y: number; zoom: number };
  clearColor?: any; // Type Color if available
  alpha?: number;
}

export const createCommitStage = (customCommit?: (context: RenderPipelineContext<any>) => void) => {
  return function CommitStage() {
    const world = useWorld();
    // Assumption: The render pipeline is named "render"
    // Ideally this should be configurable or inferred
    const system = useOverloadedSystem<any>("render");
    const data = system.data as RenderPipelineContext<StandardRenderContext>;

    const { renderer, queue, custom } = data;
    const alpha = custom.alpha ?? 0;

    renderer.beginFrame();

    if (custom.clearColor) {
      renderer.clear(custom.clearColor);
    }

    if (custom.view) {
      renderer.setCamera(custom.view.x, custom.view.y, custom.view.zoom);
    }

    // 1. Shapes
    for (const id of queue.shapes) {
      const shape = world.get(id, Shape);
      const transform = world.get(id, Transform2D);
      if (shape && transform) {
        renderer.renderShape(shape, transform, alpha);
      }
    }

    // 2. Sprites
    for (const id of queue.sprites) {
      const sprite = world.get(id, Sprite);
      const transform = world.get(id, Transform2D);
      if (sprite && transform) {
        renderer.renderSprite(sprite, transform, alpha);
      }
    }

    if (customCommit) {
      customCommit(data);
    }

    renderer.endFrame();
  };
};

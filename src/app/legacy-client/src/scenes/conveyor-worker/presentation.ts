/**
 * Singleton presentation layer bridging the conveyor worker controller
 * to the render pipeline. Called by DrawConveyorItemsPass each frame.
 */

import type { Renderer } from "@engine/render";

type DrawFn = (renderer: Renderer) => void;

let currentDraw: DrawFn = () => undefined;

export const conveyorPresentation = {
  /** Set the active draw function. Called from the scene setup. */
  setDraw(draw: DrawFn): void {
    currentDraw = draw;
  },

  /** Called from the render pass each frame. */
  draw(renderer: Renderer): void {
    currentDraw(renderer);
  },

  /** Clear the active draw function. Called from teardown. */
  clear(): void {
    currentDraw = () => undefined;
  },
};

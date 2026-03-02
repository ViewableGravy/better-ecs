import { FromRender, fromContext } from "@engine/context";
import type { RenderQueue } from "@engine/render";

export function sortCommands(queue: RenderQueue = fromContext(FromRender.Queue)): void {
  queue.sortByLayer();
}

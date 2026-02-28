import { FromRender, fromContext } from "@context";
import type { RenderQueue } from "@render";

export function sortCommands(queue: RenderQueue = fromContext(FromRender.Queue)): void {
  queue.sortByLayer();
}

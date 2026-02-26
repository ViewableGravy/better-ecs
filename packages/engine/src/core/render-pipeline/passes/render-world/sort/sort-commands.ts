import type { RenderQueue } from "../../../../../render";

export function sortCommands(queue: RenderQueue): void {
  queue.sortByLayer();
}

import type { RenderQueue } from "../../../../../render/render-queue";

export function sortCommands(queue: RenderQueue): void {
  queue.sortByLayer();
}

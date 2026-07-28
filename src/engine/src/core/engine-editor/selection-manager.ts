import type { Registry } from "@engine/ecs/registry";
import { getEntityAtWorldPoint, type EntityAtPointOptions } from "@engine/core/input/mouse";

type EngineEditorSelectionManagerOptions = {
  getWorld: () => Registry;
};

export class EngineEditorSelectionManager {
  readonly #getWorld: () => Registry;

  public constructor(options: EngineEditorSelectionManagerOptions) {
    this.#getWorld = options.getWorld;
  }

  public entityAtPoint(
    worldX: number,
    worldY: number,
    maxDistance: number,
    options?: EntityAtPointOptions,
  ) {
    const world = this.#getWorld();
    return getEntityAtWorldPoint(world, { x: worldX, y: worldY }, maxDistance, options);
  }
}
import type { UserWorld } from "../../ecs/world";
import { getEntityAtWorldPoint, type EntityAtPointOptions } from "../input/mouse";

type EngineEditorSelectionManagerOptions = {
  getWorld: () => UserWorld;
};

export class EngineEditorSelectionManager {
  readonly #getWorld: () => UserWorld;

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
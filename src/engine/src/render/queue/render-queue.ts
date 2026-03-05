import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";
import type { ShapeRenderInput } from "@engine/render/types/low-level";

/**
 * The kind of render command stored in {@link RenderQueue}.
 */
export type RenderCommandType = "sprite-entity" | "shader-entity" | "shape-entity" | "shape-draw";

/**
 * A single render command entry.
 */
export type RenderCommand = {
  type: RenderCommandType;
  world: UserWorld | null;
  entityId: EntityId | null;
  shape: ShapeRenderInput | null;
  spriteRecordIndex?: number;
  layer: number;
  zOrder: number;
  sequence: number;
};

/**
 * A queue of render commands for the current frame.
 * Commands are pushed by passes, then sorted and executed by engine render passes.
 */
export class RenderQueue {
  public commands: RenderCommand[] = [];
  #nextSequence = 0;

  /**
   * Add a command to the queue while preserving stable insertion order.
   */
  add(command: RenderCommand): void {
    command.sequence = this.#nextSequence;
    this.#nextSequence += 1;
    this.commands.push(command);
  }

  /**
   * Sort commands by layer, then z-order, then insertion order.
   */
  sortByLayer(): void {
    this.commands.sort((a, b) => {
      if (a.layer !== b.layer) {
        return a.layer - b.layer;
      }

      if (a.zOrder !== b.zOrder) {
        return a.zOrder - b.zOrder;
      }

      return a.sequence - b.sequence;
    });
  }

  /**
   * Clear all commands.
   */
  clear(): void {
    this.commands.length = 0;
    this.#nextSequence = 0;
  }
}

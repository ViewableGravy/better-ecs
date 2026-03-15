import { Rectangle, Serializable, serializable } from "@engine";
import type { ContextId } from "@libs/spatial-contexts/context-id";

/**
 * Component that defines a region in a world that acts as an entry point to another spatial context.
 * When the player/camera enters this region, it can trigger context transitions or layering.
 */
export class ContextEntryRegion extends Serializable {
  @serializable("string")
  public targetContextId: ContextId;

  @serializable("json")
  public bounds: Rectangle;

  constructor(targetContextId: ContextId, bounds: Rectangle) {
    super();
    this.targetContextId = targetContextId;
    this.bounds = bounds;
  }
}

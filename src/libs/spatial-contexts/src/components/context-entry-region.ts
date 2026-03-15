import { Component, Rectangle, SerializableComponent, serializable } from "@engine";
import type { ContextId } from "@libs/spatial-contexts/context-id";

/**
 * Component that defines a region in a world that acts as an entry point to another spatial context.
 * When the player/camera enters this region, it can trigger context transitions or layering.
 */
@SerializableComponent
export class ContextEntryRegion extends Component {
  @serializable("string")
  declare public targetContextId: ContextId;

  @serializable("json")
  declare public bounds: Rectangle;

  constructor(targetContextId: ContextId, bounds: Rectangle) {
    super();
    this.targetContextId = targetContextId;
    this.bounds = bounds;
  }
}

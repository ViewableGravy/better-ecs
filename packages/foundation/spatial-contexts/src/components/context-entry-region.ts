import { Rectangle } from "@repo/engine";
import type { ContextId } from "../context-id";

/**
 * Component that defines a region in a world that acts as an entry point to another spatial context.
 * When the player/camera enters this region, it can trigger context transitions or layering.
 */
export class ContextEntryRegion {
  constructor(
    public targetContextId: ContextId,
    public bounds: Rectangle,
  ) {}
}

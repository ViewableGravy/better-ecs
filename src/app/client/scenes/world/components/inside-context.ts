import type { EntityId } from "@engine";
import type { ContextId } from "@lib/spatial-contexts";

export class InsideContext {
  constructor(
    public contextId: ContextId,
    public sourceRegionEntity: EntityId,
  ) {}
}

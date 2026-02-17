import type { EntityId } from "@repo/engine";
import type { ContextId } from "@repo/spatial-contexts";

export class InsideContext {
  constructor(
    public contextId: ContextId,
    public sourceRegionEntity: EntityId,
  ) {}
}

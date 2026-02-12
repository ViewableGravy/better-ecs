import type { EntityId } from "@repo/engine";
import type { ContextId } from "@repo/plugins";

export class InsideContext {
  constructor(
    public contextId: ContextId,
    public sourceRegionEntity: EntityId,
  ) {}
}

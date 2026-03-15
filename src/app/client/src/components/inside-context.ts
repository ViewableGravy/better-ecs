import type { EntityId } from "@engine";
import { Serializable, serializable } from "@engine";
import type { ContextId } from "@libs/spatial-contexts";

export class InsideContext extends Serializable {
  @serializable("string")
  public contextId: ContextId;

  @serializable("int")
  public sourceRegionEntity: EntityId;

  constructor(contextId: ContextId, sourceRegionEntity: EntityId) {
    super();
    this.contextId = contextId;
    this.sourceRegionEntity = sourceRegionEntity;
  }
}

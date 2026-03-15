import type { EntityId } from "@engine";
import { Component, SerializableComponent, serializable } from "@engine";
import type { ContextId } from "@libs/spatial-contexts";

@SerializableComponent
export class InsideContext extends Component {
  @serializable("string")
  declare public contextId: ContextId;

  @serializable("int")
  declare public sourceRegionEntity: EntityId;

  constructor(contextId: ContextId, sourceRegionEntity: EntityId) {
    super();
    this.contextId = contextId;
    this.sourceRegionEntity = sourceRegionEntity;
  }
}

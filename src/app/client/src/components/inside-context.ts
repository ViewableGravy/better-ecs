import type { EntityId } from "@engine";
import { Component, StateComponent, state } from "@engine";
import type { ContextId } from "@libs/spatial-contexts";

@StateComponent
export class InsideContext extends Component {
  @state("string")
  declare public contextId: ContextId;

  @state("int")
  declare public sourceRegionEntity: EntityId;

  constructor(contextId: ContextId, sourceRegionEntity: EntityId) {
    super();
    this.contextId = contextId;
    this.sourceRegionEntity = sourceRegionEntity;
  }
}

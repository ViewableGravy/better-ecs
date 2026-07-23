import type { EntityId } from "@engine";
import { Component } from "@engine";
import type { ContextId } from "@libs/spatial-contexts";
export class InsideContext extends Component {
  declare public contextId: ContextId;
  declare public sourceRegionEntity: EntityId;

  constructor(contextId: ContextId, sourceRegionEntity: EntityId) {
    super();
    this.contextId = contextId;
    this.sourceRegionEntity = sourceRegionEntity;
  }
}

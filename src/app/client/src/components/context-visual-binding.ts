import { Component, StateComponent, state } from "@engine";
import type { ContextId } from "@libs/spatial-contexts";

@StateComponent
export class ContextVisualBinding extends Component {
  @state("string")
  declare public contextId: ContextId;

  constructor(contextId: ContextId) {
    super();
    this.contextId = contextId;
  }
}

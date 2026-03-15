import { Component, SerializableComponent, serializable } from "@engine";
import type { ContextId } from "@libs/spatial-contexts";

@SerializableComponent
export class ContextVisualBinding extends Component {
  @serializable("string")
  declare public contextId: ContextId;

  constructor(contextId: ContextId) {
    super();
    this.contextId = contextId;
  }
}

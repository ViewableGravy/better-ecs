import { Serializable, serializable } from "@engine";
import type { ContextId } from "@libs/spatial-contexts";

export class ContextVisualBinding extends Serializable {
  @serializable("string")
  public contextId: ContextId;

  constructor(contextId: ContextId) {
    super();
    this.contextId = contextId;
  }
}

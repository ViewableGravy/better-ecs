import { Rectangle } from "@repo/engine";
import type { ContextId } from "@repo/spatial-contexts";

export class ContextEntryRegion {
  constructor(
    public targetContextId: ContextId,
    public bounds: Rectangle,
  ) {}
}

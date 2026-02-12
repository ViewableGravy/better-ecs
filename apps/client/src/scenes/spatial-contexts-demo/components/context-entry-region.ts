import { Vec2 } from "@repo/engine";
import type { ContextId } from "@repo/plugins";

export class ContextEntryRegion {
  constructor(
    public targetContextId: ContextId,
    public halfExtents: Vec2,
  ) {}
}

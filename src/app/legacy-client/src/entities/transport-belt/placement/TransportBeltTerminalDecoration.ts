import type { EntityId } from "@engine";

export type TransportBeltTerminalDecorationRole = "start" | "end";

export class TransportBeltTerminalDecoration {
  constructor(
    public ownerEntityId: EntityId,
    public role: TransportBeltTerminalDecorationRole,
  ) {}
}
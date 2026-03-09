import type { TransportBeltVariant } from "@client/entities/transport-belt";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type GhostKind = string;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class GhostPreviewComponent {
  public constructor(
    public readonly kind: GhostKind = "box",
    public transportBeltVariant: TransportBeltVariant | null = null,
  ) {}
}
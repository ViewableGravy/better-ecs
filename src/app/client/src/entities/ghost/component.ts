import type { EntityId } from "@engine";

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
    public previewVariant: string | null = null,
    public isPlaceable: boolean = true,
    public invalidIndicatorEntityId: EntityId | null = null,
  ) {}
}
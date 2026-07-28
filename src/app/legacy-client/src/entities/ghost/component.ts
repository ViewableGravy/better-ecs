import type { EntityId } from "@engine";
import { Component } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type GhostKind = string;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class GhostPreviewComponent extends Component {
  declare public readonly kind: GhostKind;
  declare public ownerId: string;
  declare public previewVariant: string | null;
  declare public isPlaceable: boolean;
  declare public invalidIndicatorEntityId: EntityId | null;

  public constructor(
    kind: GhostKind = "box",
    ownerId: string = "local-player",
    previewVariant: string | null = null,
    isPlaceable: boolean = true,
    invalidIndicatorEntityId: EntityId | null = null,
  ) {
    super();
    this.kind = kind;
    this.ownerId = ownerId;
    this.previewVariant = previewVariant;
    this.isPlaceable = isPlaceable;
    this.invalidIndicatorEntityId = invalidIndicatorEntityId;
  }
}
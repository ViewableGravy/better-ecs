import type { EntityId } from "@engine";
import { Component, StateComponent, state } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type GhostKind = string;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

@StateComponent
export class GhostPreviewComponent extends Component {
  @state("string")
  declare public readonly kind: GhostKind;

  @state("string")
  declare public ownerId: string;

  @state("json")
  declare public previewVariant: string | null;

  @state("boolean")
  declare public isPlaceable: boolean;

  @state("json")
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
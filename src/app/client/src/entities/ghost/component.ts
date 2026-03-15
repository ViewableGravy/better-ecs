import type { EntityId } from "@engine";
import { Component, SerializableComponent, serializable } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type GhostKind = string;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

@SerializableComponent
export class GhostPreviewComponent extends Component {
  @serializable("string")
  declare public readonly kind: GhostKind;

  @serializable("string")
  declare public ownerId: string;

  @serializable("json")
  declare public previewVariant: string | null;

  @serializable("boolean")
  declare public isPlaceable: boolean;

  @serializable("json")
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
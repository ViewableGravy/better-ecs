import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import type { EntityId } from "@engine";
import { Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type TransportBeltEntityId = EntityId<ConveyorBeltComponent | Transform2D>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function asTransportBeltEntityId(entityId: EntityId): TransportBeltEntityId {
	// Transport belt tagging is compile-time only; the runtime value remains the raw entity id.
	return entityId as TransportBeltEntityId;
}
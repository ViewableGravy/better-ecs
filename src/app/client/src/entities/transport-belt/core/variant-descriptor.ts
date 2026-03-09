import {
    getTransportBeltFlow,
    TRANSPORT_BELT_VARIANTS,
    type TransportBeltFlow,
    type TransportBeltVariant,
} from "@client/entities/transport-belt/consts";
import {
    getTransportBeltFlowVector,
    isStraightTransportBeltFlow,
    type SideVector,
} from "@client/entities/transport-belt/core/flow";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type TransportBeltVariantDescriptor = {
  variant: TransportBeltVariant;
  flow: TransportBeltFlow;
  isStraight: boolean;
  isCurve: boolean;
  direction: SideVector | null;
};

/**********************************************************************************************************
 *   CONSTANTS
 **********************************************************************************************************/

const TRANSPORT_BELT_VARIANT_DESCRIPTOR_BY_VARIANT: Record<string, TransportBeltVariantDescriptor> = {};

for (const variant of TRANSPORT_BELT_VARIANTS) {
  const flow = getTransportBeltFlow(variant);

  if (!flow) {
    continue;
  }

  const isStraight = isStraightTransportBeltFlow(flow);

  TRANSPORT_BELT_VARIANT_DESCRIPTOR_BY_VARIANT[variant] = {
    variant,
    flow,
    isStraight,
    isCurve: !isStraight,
    direction: isStraight ? getTransportBeltFlowVector(flow) : null,
  };
}

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getTransportBeltVariantDescriptor(variant: string): TransportBeltVariantDescriptor | undefined {
  return TRANSPORT_BELT_VARIANT_DESCRIPTOR_BY_VARIANT[variant];
}

import type { TransportBeltSide, TransportBeltVariant } from "@client/entities/transport-belt/consts";
import {
    getTransportBeltVariantDescriptor,
    TransportBeltGridQuery,
    type TransportBeltNeighborMatrix,
} from "@client/entities/transport-belt/core";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { UserWorld } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type RotationCycle = readonly [TransportBeltVariant, TransportBeltVariant, TransportBeltVariant, TransportBeltVariant];
type ContributingSide = TransportBeltSide;
type RotationSource = ContributingSide | "default";
type CardinalRule = {
  side: TransportBeltSide;
  row: number;
  column: number;
  requiredEndSide: TransportBeltSide;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const DEFAULT_ROTATION_CYCLE: RotationCycle = [
  "vertical-up",
  "horizontal-right",
  "vertical-down",
  "horizontal-left",
];

const ROTATION_CYCLE_END_SIDES_BY_SOURCE: Readonly<Record<RotationSource, readonly TransportBeltSide[]>> = {
  default: ["top", "right", "bottom", "left"],
  left: ["right", "bottom", "left", "top"],
  right: ["left", "top", "right", "bottom"],
  top: ["bottom", "left", "top", "right"],
  bottom: ["top", "right", "bottom", "left"],
};

const ROTATION_VARIANT_BY_END_SIDE_BY_SOURCE: Readonly<Record<RotationSource, Readonly<Record<TransportBeltSide, TransportBeltVariant>>>> = {
  default: {
    top: "vertical-up",
    right: "horizontal-right",
    bottom: "vertical-down",
    left: "horizontal-left",
  },
  left: {
    top: "angled-left-up",
    right: "horizontal-right",
    bottom: "angled-left-bottom",
    left: "horizontal-left",
  },
  right: {
    top: "angled-right-up",
    right: "horizontal-right",
    bottom: "angled-right-bottom",
    left: "horizontal-left",
  },
  top: {
    top: "vertical-up",
    right: "angled-up-right",
    bottom: "vertical-down",
    left: "angled-top-left",
  },
  bottom: {
    top: "vertical-up",
    right: "angled-bottom-right",
    bottom: "vertical-down",
    left: "angled-bottom-left",
  },
};

const CARDINAL_CONTRIBUTOR_PRECEDENCE: readonly CardinalRule[] = [
  { side: "bottom", row: 2, column: 1, requiredEndSide: "top" },
  { side: "left", row: 1, column: 0, requiredEndSide: "right" },
  { side: "top", row: 0, column: 1, requiredEndSide: "bottom" },
  { side: "right", row: 1, column: 2, requiredEndSide: "left" },
];

export class TransportBeltPlacementRotationManager {
  public static resolveVariant(
    world: UserWorld,
    coordinates: GridCoordinates,
    desiredEndSide: TransportBeltSide,
  ): TransportBeltVariant {
    const source = this.resolveRotationSource(TransportBeltGridQuery.buildNeighborMatrix(world, coordinates));

    return ROTATION_VARIANT_BY_END_SIDE_BY_SOURCE[source][desiredEndSide];
  }

  public static resolveRotationCycle(
    world: UserWorld,
    coordinates: GridCoordinates,
  ): RotationCycle {
    const matrix = TransportBeltGridQuery.buildNeighborMatrix(world, coordinates);

    return this.resolveRotationCycleFromMatrix(matrix);
  }

  public static resolveRotationCycleFromMatrix(matrix: TransportBeltNeighborMatrix): RotationCycle {
    const source = this.resolveRotationSource(matrix);

    if (source === "default") {
      return DEFAULT_ROTATION_CYCLE;
    }

    const orderedEndSides = ROTATION_CYCLE_END_SIDES_BY_SOURCE[source];
    const variantsByEndSide = ROTATION_VARIANT_BY_END_SIDE_BY_SOURCE[source];

    return [
      variantsByEndSide[orderedEndSides[0]],
      variantsByEndSide[orderedEndSides[1]],
      variantsByEndSide[orderedEndSides[2]],
      variantsByEndSide[orderedEndSides[3]],
    ];
  }

  private static resolveRotationSource(matrix: TransportBeltNeighborMatrix): RotationSource {
    const contributingSide = this.resolveContributingSide(matrix);

    if (contributingSide === null) {
      return "default";
    }

    return contributingSide;
  }

  private static resolveContributingSide(matrix: TransportBeltNeighborMatrix): ContributingSide | null {
    for (const rule of CARDINAL_CONTRIBUTOR_PRECEDENCE) {
      const variant = matrix[rule.row][rule.column];

      if (!variant) {
        continue;
      }

      const descriptor = getTransportBeltVariantDescriptor(variant);

      if (!descriptor) {
        continue;
      }

      const [, endSide] = descriptor.flow;

      if (endSide !== rule.requiredEndSide) {
        continue;
      }

      return rule.side;
    }

    return null;
  }
}

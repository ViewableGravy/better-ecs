import type { BeltStressItemCount } from "@legacy/scenes/belt-stress/config";
import type { BeltStressPresentationMetrics } from "@legacy/scenes/belt-stress/presentation";

export type BeltStressStatus = {
  readonly itemCount: BeltStressItemCount;
  readonly beltCount: number;
  readonly workerTick: number;
  readonly simulationTimeMs: number;
  readonly skippedPublications: number;
  readonly checksum: number;
  readonly render: BeltStressPresentationMetrics;
};

export type BeltStressHarness = {
  readonly targets: readonly BeltStressItemCount[];
  configure(itemCount: number): void;
  status(): BeltStressStatus;
};

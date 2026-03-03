import type { UserWorld } from "@engine";
import { ConveyorMovementGroupedUtilities } from "./utils";

export class ConveyorMovementUtilities {
	public static apply(world: UserWorld, seconds: number): void {
		ConveyorMovementGroupedUtilities.apply(world, seconds);
	}
}

import type { ClientCommand } from "@client/commands/types";
import { CommandAllocator } from "@client/singletons/commandAllocator";
import { supportsDragPlacement } from "@client/systems/world/build-mode/build-items";
import type { BuildModeState } from "@client/systems/world/build-mode/const";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { PlacementTargetResolution } from "@client/systems/world/build-mode/placement-target";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function emitBuildModeCommands(
  commands: ClientCommand[],
  data: BuildModeState,
  gridCoordinates: GridCoordinates,
  placementTarget: PlacementTargetResolution,
): void {
  const commitContextId = placementTarget.commitContextId;

  if (commitContextId && data.pendingDelete) {
    commands.push(CommandAllocator.acquire(
      "client:build-mode-delete-command",
      commitContextId,
      gridCoordinates[0],
      gridCoordinates[1],
    ));
  }

  if (!commitContextId || data.selectedItem === null) {
    return;
  }

  if (!supportsDragPlacement(data.selectedItem)) {
    if (!data.pendingPlace) {
      return;
    }

    return void commands.push(CommandAllocator.acquire(
      "client:build-mode-place-command",
      data.selectedItem,
      commitContextId,
      gridCoordinates[0],
      gridCoordinates[1],
      data.placementEndSide,
    ));
  }

  const dragPlacementBatch = BuildModeDragPlacement.resolvePlacementBatch(data, gridCoordinates);

  for (const candidate of dragPlacementBatch.candidates) {
    commands.push(CommandAllocator.acquire(
      "client:build-mode-place-command",
      data.selectedItem,
      commitContextId,
      candidate[0],
      candidate[1],
      data.placementEndSide,
    ));
  }
}
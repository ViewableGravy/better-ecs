import { buildModeStateDefault, type BuildModeState } from "@client/systems/world/build-mode/const";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import type { GridCoordinate } from "@client/systems/world/build-mode/grid-singleton";
import { Placement } from "@client/systems/world/build-mode/placement";
import type { RegisteredEngine } from "@engine";
import type { BuildModeCommand } from "@libs/commands/build-mode";

const commandBuildModeState: BuildModeState = {
  ...buildModeStateDefault,
};

export function executeBuildModeCommands(
  engine: RegisteredEngine,
  commands: readonly BuildModeCommand[],
  buildModeState: BuildModeState,
): void {
  for (const command of commands) {
    if (command.type === "build-mode:delete") {
      executeDeleteCommand(engine, command.gridX, command.gridY);
      continue;
    }

    executePlaceCommand(engine, command, buildModeState);
  }
}

function executeDeleteCommand(
  engine: RegisteredEngine,
  gridX: GridCoordinate,
  gridY: GridCoordinate,
): void {
  Placement.deleteAtGrid(engine.scene.registry, [gridX, gridY]);
}

function executePlaceCommand(
  engine: RegisteredEngine,
  command: Extract<BuildModeCommand, { type: "build-mode:place" }>,
  buildModeState: BuildModeState,
): void {
  const commitWorld = engine.scene.registry;

  commandBuildModeState.selectedItem = command.itemType;
  commandBuildModeState.placementEndSide = command.placementEndSide;

  const resolvedPlacement = Placement.resolveSelection({
    inputWorld: commitWorld,
    focusedWorld: commitWorld,
    previewWorld: commitWorld,
    commitWorld,
    blocked: false,
  }, [command.gridX, command.gridY], commandBuildModeState);

  if (!resolvedPlacement?.canPlace) {
    return;
  }

  resolvedPlacement.commit.execute();

  BuildModeDragPlacement.recordPlacement(buildModeState, resolvedPlacement.intent.context.gridCoordinates);
}

import type { ClientCommand } from "@client/commands/types";
import { buildModeStateDefault, type BuildModeState } from "@client/systems/world/build-mode/const";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import type { GridCoordinate } from "@client/systems/world/build-mode/grid-singleton";
import { Placement } from "@client/systems/world/build-mode/placement";
import { resolvePlacementRenderVisibilityRole } from "@client/systems/world/build-mode/utils";
import type { RegisteredEngine } from "@engine";
import type { ContextId } from "@libs/spatial-contexts";
import { SpatialContexts } from "@libs/spatial-contexts";

const commandBuildModeState: BuildModeState = {
  ...buildModeStateDefault,
  commands: [],
};

export function executeBuildModeCommands(
  engine: RegisteredEngine,
  commands: readonly ClientCommand[],
  buildModeState: BuildModeState,
): void {
  for (const command of commands) {
    if (command.type === "build-mode:delete") {
      executeDeleteCommand(engine, command.contextId, command.gridX, command.gridY);
      continue;
    }

    executePlaceCommand(engine, command, buildModeState);
  }
}

function executeDeleteCommand(
  engine: RegisteredEngine,
  contextId: ContextId,
  gridX: GridCoordinate,
  gridY: GridCoordinate,
): void {
  const manager = SpatialContexts.requireManager(engine.scene.context);
  const commitWorld = manager.getWorld(contextId);

  if (!commitWorld) {
    return;
  }

  Placement.deleteAtGrid(commitWorld, [gridX, gridY]);
}

function executePlaceCommand(
  engine: RegisteredEngine,
  command: Extract<ClientCommand, { type: "build-mode:place" }>,
  buildModeState: BuildModeState,
): void {
  const manager = SpatialContexts.requireManager(engine.scene.context);
  const commitWorld = manager.getWorld(command.contextId);

  if (!commitWorld) {
    return;
  }

  commandBuildModeState.selectedItem = command.itemType;
  commandBuildModeState.placementEndSide = command.placementEndSide;

  const resolvedPlacement = Placement.resolveSelection({
    inputWorld: commitWorld,
    focusedWorld: commitWorld,
    previewWorld: commitWorld,
    previewContextId: undefined,
    focusedContextId: undefined,
    hoveredContextId: undefined,
    commitContextId: undefined,
    commitWorld,
    relationship: undefined,
    blocked: false,
  }, [command.gridX, command.gridY], commandBuildModeState);

  if (!resolvedPlacement?.canPlace) {
    return;
  }

  resolvedPlacement.commit.execute(
    resolvePlacementRenderVisibilityRole(engine, command.contextId),
  );

  BuildModeDragPlacement.recordPlacement(buildModeState, resolvedPlacement.intent.context.gridCoordinates);
}
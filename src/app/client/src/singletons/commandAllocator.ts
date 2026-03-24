import { Allocator } from "@engine";

import {
    createBuildModeDeleteCommandFactory,
    createBuildModePlaceCommandFactory,
} from "@client/systems/world/build-mode/commands/factories";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const CommandAllocator = new Allocator({
  "client:build-mode-delete-command": createBuildModeDeleteCommandFactory(),
  "client:build-mode-place-command": createBuildModePlaceCommandFactory(),
});
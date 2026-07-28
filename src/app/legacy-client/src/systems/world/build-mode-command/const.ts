import type { BuildModeCommand } from "@libs/commands/build-mode";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type BuildModeCommandState = {
  commands: BuildModeCommand[];
};

export const buildModeCommandStateDefault: BuildModeCommandState = {
  commands: [],
};
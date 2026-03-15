import type { SerializedWorld } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type SerializedSceneWorld = {
  worldId: string;
  world: SerializedWorld;
};

export type SerializedSceneState = {
  sceneName: string;
  worlds: SerializedSceneWorld[];
};
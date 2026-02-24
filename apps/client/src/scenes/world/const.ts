import { contextId } from "@repo/spatial-contexts";

export const sceneConfig = {
  contextIds: {
    overworld: contextId("default"),
    house: contextId("house_1"),
    dungeon: contextId("dungeon_1"),
  },
  house: {
    halfWidth: 160,
    halfHeight: 120,
  },
};
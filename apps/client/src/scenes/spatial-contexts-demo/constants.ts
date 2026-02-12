import { contextId } from "@repo/plugins";

export const OVERWORLD = contextId("default");
export const HOUSE = contextId("house_1");
export const DUNGEON = contextId("dungeon_1");

export const HOUSE_HALF_WIDTH = 160;
export const HOUSE_HALF_HEIGHT = 120;

export function isInsideHouse(x: number, y: number): boolean {
  return Math.abs(x) <= HOUSE_HALF_WIDTH && Math.abs(y) <= HOUSE_HALF_HEIGHT;
}

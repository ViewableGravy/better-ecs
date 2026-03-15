import { PlayerComponent } from "@client/components/player";
import { createSystem, mutate } from "@engine";
import { Transform2D } from "@engine/components";
import { System as ContextSystem, fromContext, World } from "@engine/context";
import { z } from "zod";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
// TEMPORARY: remove once persistent save/load is handled by proper world IO.
const PLAYER_POSITION_STORAGE_KEY = "temp:player-position";

const PlayerPositionStorageSchema = z.object({
  x: z.number(),
  y: z.number(),
});

type AutoSaveState = {
  hasHydrated: boolean;
  lastSavedX: number | null;
  lastSavedY: number | null;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const System = createSystem("temp:auto-save-player-position")({
  state: {
    hasHydrated: false,
    lastSavedX: null,
    lastSavedY: null,
  } as AutoSaveState,
  system() {
    const world = fromContext(World);
    const { data } = fromContext(ContextSystem("temp:auto-save-player-position"));

    const [playerId] = world.invariantQuery(PlayerComponent);
    const transform = world.require(playerId, Transform2D);

    if (!data.hasHydrated) {
      data.hasHydrated = true;

      const hydrated = tryReadStoredPlayerPosition();
      if (hydrated) {
        mutate(transform, "curr", (curr) => {
          curr.pos.set(hydrated.x, hydrated.y);
        });
        transform.prev.pos.set(hydrated.x, hydrated.y);
        data.lastSavedX = hydrated.x;
        data.lastSavedY = hydrated.y;
        return;
      }
    }

    const x = transform.curr.pos.x;
    const y = transform.curr.pos.y;

    if (data.lastSavedX === x && data.lastSavedY === y) {
      return;
    }

    data.lastSavedX = x;
    data.lastSavedY = y;
    tryWriteStoredPlayerPosition({ x, y });
  },
});

function tryReadStoredPlayerPosition(): { x: number; y: number } | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PLAYER_POSITION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = PlayerPositionStorageSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function tryWriteStoredPlayerPosition(position: { x: number; y: number }): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PLAYER_POSITION_STORAGE_KEY, JSON.stringify(position));
}

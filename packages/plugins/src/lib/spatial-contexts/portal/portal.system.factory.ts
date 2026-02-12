import { createSystem, useWorld } from "@repo/engine";
import z from "zod";
import { useContextManager } from "../hooks";
import { Portal } from "./portal.component";
import type { PortalSystemOptions } from "./portal.types";

export const createPortalSystem = (opts: PortalSystemOptions) => {
  return createSystem("plugin:spatial-contexts-portals")({
    phase: "update",
    priority: 50_000,
    schema: {
      default: {},
      schema: z.object({}),
    },
    system() {
      const manager = useContextManager();
      const world = useWorld();
      const focusedContextId = manager.getFocusedContextId();

      // Only process portals in the focused world.
      if (manager.getWorld(focusedContextId) !== world) return;

      for (const portalEntity of world.query(Portal)) {
        const portal = world.get(portalEntity, Portal);
        if (!portal) continue;

        const args = { world, portalEntity, portal, focusedContextId };

        if (!opts.shouldActivate(args)) continue;

        const nextFocusedContextId = portal.targetContextId;
        void manager.setFocusedContextId(nextFocusedContextId);
        opts.onEnter?.({ ...args, nextFocusedContextId });

        if (portal.mode === "teleport") {
          opts.onTeleport?.({ ...args, nextFocusedContextId });
        }
      }
    },
  });
};

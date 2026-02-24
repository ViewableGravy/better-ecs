import { createSystem, useWorld } from "@repo/engine";
import { useContextManager } from "../hooks";
import { Portal } from "./portal.component";
import type { PortalSystemOptions } from "./portal.types";

export const createPortalSystem = <const TName extends string = "plugin:spatial-contexts-portals">(
  opts: PortalSystemOptions<TName>,
) => {
  // `opts.name` is optional, so this local fallback is required to pass a concrete string.
  // The cast keeps the literal type when a name is provided and defaults to the built-in literal.
  const systemName = (opts.name ?? "plugin:spatial-contexts-portals") as TName;

  return createSystem(systemName)({
    priority: 50_000,
    system() {
      const manager = useContextManager();
      const world = useWorld();
      const focusedContextId = manager.focusedContextId;

      // `useWorld()` is already bound to the focused context world by the runtime system.
      // Do not compare wrapper object identity here: SceneManager and SceneContext use
      // different UserWorld wrappers for the same internal world.

      for (const portalEntity of world.query(Portal)) {
        const portal = world.get(portalEntity, Portal);
        if (!portal) continue;

        const args = { world, portalEntity, portal, focusedContextId };

        if (!opts.shouldActivate(args)) continue;

        const nextFocusedContextId = portal.targetContextId;
        manager.setFocusedContextId(nextFocusedContextId);
        const nextWorld = manager.requireWorld(nextFocusedContextId);

        opts.onEnter?.({ ...args, nextFocusedContextId, nextWorld });

        if (portal.mode === "teleport") {
          opts.onTeleport?.({ ...args, nextFocusedContextId, nextWorld });
        }

        return;
      }
    },
  });
};

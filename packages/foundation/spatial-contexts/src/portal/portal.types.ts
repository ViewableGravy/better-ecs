import type { EntityId, UserWorld } from "@repo/engine";
import type { ContextId } from "../context-id";
import type { Portal } from "./portal.component";

export type PortalActivationArgs = {
  world: UserWorld;
  portalEntity: EntityId;
  portal: Portal;
  focusedContextId: ContextId;
};

export type PortalSystemOptions<TName extends string> = {
  /** Optional system name override. */
  name?: TName;

  /**
   * Return true to activate a portal. The plugin does not enforce any trigger shape in v1.
   */
  shouldActivate: (args: PortalActivationArgs) => boolean;

  onEnter?: (
    args: PortalActivationArgs & { nextFocusedContextId: ContextId; nextWorld: UserWorld },
  ) => void;

  /** Called when a teleport portal is activated (after focusing the target). */
  onTeleport?: (
    args: PortalActivationArgs & { nextFocusedContextId: ContextId; nextWorld: UserWorld },
  ) => void;
};

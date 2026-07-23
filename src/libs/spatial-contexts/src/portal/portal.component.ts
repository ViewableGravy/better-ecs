import { Component } from "@engine";
import type { ContextId } from "@libs/spatial-contexts/context-id";

export type PortalMode = "focus" | "teleport";

export type PortalSpawn2D = {
  x: number;
  y: number;
};

export type PortalOpts = {
  mode: PortalMode;
  targetContextId: ContextId;
  spawn?: PortalSpawn2D;

  /** If true, game code should require an interaction (e.g. press key). */
  requireInteraction?: boolean;

  /** Optional debug label. */
  label?: string;
};

const DEFAULT_PORTAL_OPTS: PortalOpts = {
  mode: "focus",
  targetContextId: "" as ContextId,
};
export class Portal extends Component {
  declare public mode: PortalMode;
  declare public targetContextId: ContextId;
  declare public spawn?: PortalSpawn2D;
  declare public requireInteraction: boolean;
  declare public label?: string;

  constructor(opts: PortalOpts = DEFAULT_PORTAL_OPTS) {
    super();
    this.mode = opts.mode;
    this.targetContextId = opts.targetContextId;
    this.spawn = opts.spawn;
    this.requireInteraction = opts.requireInteraction ?? false;
    this.label = opts.label;
  }
}

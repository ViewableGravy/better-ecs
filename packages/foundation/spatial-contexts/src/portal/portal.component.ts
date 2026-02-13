import type { ContextId } from "../context-id";

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

export class Portal {
  public mode: PortalMode;
  public targetContextId: ContextId;
  public spawn?: PortalSpawn2D;
  public requireInteraction: boolean;
  public label?: string;

  constructor(opts: PortalOpts) {
    this.mode = opts.mode;
    this.targetContextId = opts.targetContextId;
    this.spawn = opts.spawn;
    this.requireInteraction = opts.requireInteraction ?? false;
    this.label = opts.label;
  }
}

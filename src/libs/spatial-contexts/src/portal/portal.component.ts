import { Serializable, serializable } from "@engine";
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

export class Portal extends Serializable {
  @serializable("string")
  public mode: PortalMode;

  @serializable("string")
  public targetContextId: ContextId;

  @serializable("json")
  public spawn?: PortalSpawn2D;

  @serializable("boolean")
  public requireInteraction: boolean;

  @serializable("string")
  public label?: string;

  constructor(opts: PortalOpts) {
    super();
    this.mode = opts.mode;
    this.targetContextId = opts.targetContextId;
    this.spawn = opts.spawn;
    this.requireInteraction = opts.requireInteraction ?? false;
    this.label = opts.label;
  }
}

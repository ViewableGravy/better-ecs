import { Component, StateComponent, state } from "@engine";
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

@StateComponent
export class Portal extends Component {
  @state("string")
  declare public mode: PortalMode;

  @state("string")
  declare public targetContextId: ContextId;

  @state("json")
  declare public spawn?: PortalSpawn2D;

  @state("boolean")
  declare public requireInteraction: boolean;

  @state("string")
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

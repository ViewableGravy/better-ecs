import { ContextVisualBinding } from "@/scenes/world/components/context-visual-binding";
import { BlendTransition, BlendTransitionMutator } from "@/scenes/world/systems/houseTransition/transitionMutator";
import type { ContextId, SpatialContextManager } from "@repo/spatial-contexts";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class ContextFocusBlendTransitionMutator extends BlendTransitionMutator {
  private _manager: SpatialContextManager | null = null;

  constructor() {
    super();
  }

  public set manager(value: SpatialContextManager) {
    this._manager = value;
  }

  public get manager(): SpatialContextManager {
    if (!this._manager) {
      throw new Error("ContextFocusBlendTransitionMutator requires a SpatialContextManager instance to operate. Set the manager property before use.");
    }

    return this._manager;
  }

  /**
   * Yields all ContextVisualBinding components that are children of the root context, 
   * along with their associated BlendTransition components.
   */
  public *rootVisualBindings(): Generator<ContextVisualBinding, void, unknown> {
    const { rootWorld } = this.manager;

    for (const entityId of rootWorld.query(BlendTransition, ContextVisualBinding)) {
      const visualBinding = rootWorld.require(entityId, ContextVisualBinding);
      const transition = rootWorld.require(entityId, BlendTransition);
      this.set(transition);
      yield visualBinding;
    }
  }

  /**
   * Fades in the visual binding for the given context, while fading out
   * all other visual bindings.
   */
  public applyFade(contextId?: ContextId): void {
    for (const visualBinding of this.rootVisualBindings()) {
      if (visualBinding.contextId === contextId) {
        this.setTarget(1);
      } else {
        this.setTarget(0);
      }
    }
  }
}
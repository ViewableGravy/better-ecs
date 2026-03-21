import { ContextVisualBinding } from "@client/components/context-visual-binding";
import { InsideContext } from "@client/components/inside-context";
import { PlayerComponent } from "@client/components/player";
import {
    HOUSE_INTERIOR,
    HOUSE_ROOF,
    OUTSIDE,
    RenderVisibility,
} from "@client/components/render-visibility";
import {
    BlendTransition,
    BlendTransitionMutator,
} from "@client/systems/world/house-transition/transitionMutator";
import { lerp } from "@client/utilities/math";
import type { UserWorld } from "@engine";
import { AnimatedSprite, FillColor, Shape, Sprite, StrokeColor, Tint } from "@engine/components";
import type {
    ContextId,
    SpatialContextManager,
} from "@libs/spatial-contexts";

import { INSIDE_OUTSIDE_ALPHA } from "./const";

const transitionMutator = new BlendTransitionMutator();

type PlayerAlphaArgs = {
  contextId: ContextId;
  focusedContextId: ContextId;
  rootContextId: ContextId;
  activeInteriorContextId?: ContextId;
};

type AlphaMultiplierArgs = {
  role: RenderVisibility["role"];
  blendByContext: ReadonlyMap<ContextId, number>;
  activeInteriorBlend: number;
  worldContextId: ContextId;
  activeInteriorContextId?: ContextId;
  visualContextId?: ContextId;
};

export function applyHouseVisuals(
  world: UserWorld,
  manager: SpatialContextManager,
): void {
  const contextId = getContextIdByWorld(manager, world);
  if (!contextId) {
    return;
  }

  const rootContextId = manager.rootContextId;
  const focusedContextId = manager.focusedContextId;
  const activeInteriorContextId = getActiveInteriorContextId(manager, focusedContextId, rootContextId);
  const blendByContext = getRoofBlendByContext(manager);
  const activeInteriorBlend = activeInteriorContextId === undefined
    ? 0
    : (blendByContext.get(activeInteriorContextId) ?? 0);

  const playerAlpha = getPlayerAlpha({
    contextId,
    focusedContextId,
    rootContextId,
    activeInteriorContextId,
  });

  applyPlayerAlpha(world, playerAlpha);
  applyShapeAlpha(world, {
    blendByContext,
    activeInteriorBlend,
    worldContextId: contextId,
    activeInteriorContextId,
  });
}

function applyPlayerAlpha(world: UserWorld, alpha: number): void {
  for (const entityId of world.query(PlayerComponent, Sprite)) {
    const tint = world.get(entityId, Tint);

    if (tint) {
      tint.value.a = alpha;
    } else {
      const nextTint = new Tint();
      nextTint.value.a = alpha;
      world.add(entityId, nextTint);
    }
  }

  for (const entityId of world.query(PlayerComponent, AnimatedSprite)) {
    const tint = world.get(entityId, Tint);

    if (tint) {
      tint.value.a = alpha;
    } else {
      const nextTint = new Tint();
      nextTint.value.a = alpha;
      world.add(entityId, nextTint);
    }
  }
}

function applyShapeAlpha(
  world: UserWorld,
  args: {
    blendByContext: ReadonlyMap<ContextId, number>;
    activeInteriorBlend: number;
    worldContextId: ContextId;
    activeInteriorContextId?: ContextId;
  },
): void {
  const {
    blendByContext,
    activeInteriorBlend,
    worldContextId,
    activeInteriorContextId,
  } = args;

  for (const entityId of world.query(Shape, RenderVisibility)) {
    const visibility = world.require(entityId, RenderVisibility);
    const visualBinding = world.get(entityId, ContextVisualBinding);
    const alphaMultiplier = getAlphaMultiplier({
      role: visibility.role,
      blendByContext,
      activeInteriorBlend,
      worldContextId,
      activeInteriorContextId,
      visualContextId: visualBinding?.contextId,
    });
    const nextAlpha = visibility.baseAlpha * alphaMultiplier;
    const fillColor = world.get(entityId, FillColor);
    const strokeColor = world.get(entityId, StrokeColor);

    if (fillColor) {
      fillColor.value.a = nextAlpha;
    }

    if (strokeColor) {
      strokeColor.value.a = nextAlpha;
    }
  }
}

function getContextIdByWorld(
  manager: SpatialContextManager,
  world: UserWorld,
): ContextId | undefined {
  for (const { id } of manager.listDefinitions()) {
    if (manager.getWorld(id) === world) {
      return id;
    }
  }

  return undefined;
}

function getActiveInteriorContextId(
  manager: SpatialContextManager,
  focusedContextId: ContextId,
  rootContextId: ContextId,
): ContextId | undefined {
  if (focusedContextId !== rootContextId) {
    return focusedContextId;
  }

  const rootWorld = manager.getWorld(rootContextId);
  if (!rootWorld) {
    return undefined;
  }

  const [playerId] = rootWorld.query(PlayerComponent);
  if (!playerId) {
    return undefined;
  }

  return rootWorld.get(playerId, InsideContext)?.contextId;
}

function getPlayerAlpha(args: PlayerAlphaArgs): number {
  const { contextId, focusedContextId, rootContextId, activeInteriorContextId } = args;

  if (focusedContextId === rootContextId && activeInteriorContextId) {
    if (contextId === activeInteriorContextId) {
      return 1;
    }

    if (contextId === rootContextId) {
      return 1;
    }

    return 0;
  }

  return contextId === focusedContextId ? 1 : 0;
}

function getAlphaMultiplier(args: AlphaMultiplierArgs): number {
  const {
    role,
    blendByContext,
    activeInteriorBlend,
    worldContextId,
    activeInteriorContextId,
    visualContextId,
  } = args;

  if (role === OUTSIDE) {
    return lerp(1, INSIDE_OUTSIDE_ALPHA, activeInteriorBlend);
  }

  if (role === HOUSE_ROOF) {
    if (activeInteriorContextId && visualContextId === activeInteriorContextId) {
      return 1 - (blendByContext.get(activeInteriorContextId) ?? 0);
    }

    return 1;
  }

  if (role === HOUSE_INTERIOR) {
    if (!activeInteriorContextId) {
      return 0;
    }

    if (worldContextId !== activeInteriorContextId) {
      return 0;
    }

    return blendByContext.get(worldContextId) ?? 0;
  }

  return 1;
}

function getRoofBlendByContext(manager: SpatialContextManager): ReadonlyMap<ContextId, number> {
  const blendByContext = new Map<ContextId, number>();

  const rootWorld = manager.getWorld(manager.rootContextId);
  if (!rootWorld) {
    return blendByContext;
  }

  for (const entityId of rootWorld.query(ContextVisualBinding, BlendTransition)) {
    const visualBinding = rootWorld.require(entityId, ContextVisualBinding);
    const transition = rootWorld.require(entityId, BlendTransition);
    transitionMutator.set(transition);
    blendByContext.set(visualBinding.contextId, transition.curr);
  }

  return blendByContext;
}
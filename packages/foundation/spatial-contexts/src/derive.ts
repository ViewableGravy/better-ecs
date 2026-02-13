import type { ContextId } from "./context-id";
import type { ContextPolicy } from "./policy";

export type DerivedSets = {
  /** Visible context ids in render order (parents first, focused last). */
  visible: readonly ContextId[];
  /** Simulated context ids in update order (focused first, then parents). */
  simulated: readonly ContextId[];
};

export function deriveSetsFromPolicy(
  stack: readonly ContextId[],
  policy: ContextPolicy,
): DerivedSets {
  const focused = stack[0];
  if (!focused) {
    return { visible: [], simulated: [] };
  }

  const visible = policy.visibility === "stack" ? [...stack].reverse() : [focused];
  const simulated = policy.simulation === "stack" ? [...stack] : [focused];

  return { visible, simulated };
}

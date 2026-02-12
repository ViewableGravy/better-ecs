export type ContextVisibilityPolicy = "focused-only" | "stack";
export type ContextSimulationPolicy = "focused-only" | "stack";

export type ContextPolicy = {
  visibility: ContextVisibilityPolicy;
  simulation: ContextSimulationPolicy;
};

export const DEFAULT_CONTEXT_POLICY: ContextPolicy = {
  visibility: "focused-only",
  simulation: "focused-only",
};

export function mergePolicy(partial?: Partial<ContextPolicy>): ContextPolicy {
  if (!partial) return DEFAULT_CONTEXT_POLICY;

  return {
    visibility: partial.visibility ?? DEFAULT_CONTEXT_POLICY.visibility,
    simulation: partial.simulation ?? DEFAULT_CONTEXT_POLICY.simulation,
  };
}

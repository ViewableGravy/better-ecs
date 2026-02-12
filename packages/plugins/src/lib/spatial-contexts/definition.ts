import type { UserWorld } from "@repo/engine";
import type { ContextId } from "./context-id";
import type { ContextPolicy } from "./policy";

export type ContextSetup = (world: UserWorld) => void | Promise<void>;

export type ContextDefinition = {
  id: ContextId;
  parentId?: ContextId;
  policy?: Partial<ContextPolicy>;
  setup?: ContextSetup;
};

export function defineContext(def: ContextDefinition): ContextDefinition {
  return def;
}

export function createHouseContext(
  def: Omit<ContextDefinition, "policy"> & { policy?: ContextDefinition["policy"] },
): ContextDefinition {
  return {
    ...def,
    policy: {
      visibility: "focused-only",
      simulation: "stack",
      ...def.policy,
    },
  };
}

export function createDungeonContext(
  def: Omit<ContextDefinition, "policy"> & { policy?: ContextDefinition["policy"] },
): ContextDefinition {
  return {
    ...def,
    policy: {
      visibility: "focused-only",
      simulation: "focused-only",
      ...def.policy,
    },
  };
}

import type { UserWorld } from "@engine";
import type { ContextId } from "@libs/spatial-contexts/context-id";
import type { ContextPolicy } from "@libs/spatial-contexts/policy";

export type ContextSetup = (world: UserWorld) => void;

export type ContextDefinition = {
  id: ContextId;
  parentId?: ContextId;
  policy?: Partial<ContextPolicy>;
  setup?: ContextSetup;
};

export function defineContext(def: ContextDefinition): ContextDefinition {
  return def;
}

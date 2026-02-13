import type { UserWorld } from "@repo/engine";
import type { ContextId } from "./context-id";
import type { ContextPolicy } from "./policy";

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

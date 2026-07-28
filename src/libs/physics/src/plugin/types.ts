import type { KeyBind } from "@engine";

export type PhysicsOpts = {
  debug?: false | {
    keybind: KeyBind;
  };
};

export type PhysicsDebugOpts = Exclude<NonNullable<PhysicsOpts["debug"]>, false>;

export type DebugState = {
  visible: boolean;
};

import { Component } from "@engine/ecs/component";
import { notifyTrackedFieldMutation } from "@engine/serialization/serializableComponent";
import { registerSerializableField, type SerializableType, type StatePolicy } from "@engine/serialization/state";
import invariant from "tiny-invariant";


type StateFieldOptions = {
  policy?: Partial<StatePolicy>;
};

export function state(type: SerializableType = "json", options?: StateFieldOptions) {
  return function decorator(target: { constructor: Function }, propertyKey: string | symbol) {
    invariant(typeof propertyKey === "string", "Serializable fields must use string property names");

    registerSerializableField(target.constructor, {
      property: propertyKey,
      type,
      policy: options?.policy,
    });

    const storageKey = Symbol(`serializable:${propertyKey}`);

    Object.defineProperty(target, propertyKey, {
      enumerable: true,
      configurable: true,
      get(this: Record<PropertyKey, unknown>) {
        return this[storageKey];
      },
      set(this: Record<PropertyKey, unknown>, nextValue: unknown) {
        const component = this as unknown as Component;
        this[storageKey] = nextValue;

        if (component instanceof Component) {
          notifyTrackedFieldMutation(component, propertyKey);
        }
      },
    });
  };
}

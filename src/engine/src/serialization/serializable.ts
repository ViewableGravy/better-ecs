import { Component } from "@engine/ecs/component";
import { notifyTrackedFieldMutation } from "@engine/serialization/serializableComponent";
import { registerSerializableField, type SerializableType, type StatePolicy } from "@engine/serialization/state";
import invariant from "tiny-invariant";


type StateFieldOptions = {
  policy?: Partial<StatePolicy>;
};

type StandardFieldDecoratorContext = {
  kind: string;
  name: string | symbol;
};

type TargetOrValue = { constructor: Function } | undefined;
type PropertyKeyOrContext = string | symbol | StandardFieldDecoratorContext;

export function state(type: SerializableType = "json", options?: StateFieldOptions) {
  return function decorator(targetOrValue: TargetOrValue, propertyKeyOrContext: PropertyKeyOrContext): any {
    if (typeof propertyKeyOrContext === "string" || typeof propertyKeyOrContext === "symbol") {
      invariant(typeof propertyKeyOrContext === "string", "Serializable fields must use string property names");
      invariant(targetOrValue !== undefined, "Legacy state decorator target must be defined");

      return defineTrackedField(targetOrValue, propertyKeyOrContext, type, options);
    }

    const context = propertyKeyOrContext;
    invariant(typeof context.name === "string", "Serializable fields must use string property names");

    const propertyKey = context.name;
    const storageKey = Symbol(`serializable:${propertyKey}`);
    let registeredConstructor: Function | null = null;

    return function initialize(this: Record<PropertyKey, unknown>, initialValue: unknown) {
      const constructor = (this as { constructor?: Function }).constructor;
      invariant(typeof constructor === "function", "Serializable field initializer requires a constructor");

      if (registeredConstructor !== constructor) {
        registerSerializableField(constructor, {
          property: propertyKey,
          type,
          policy: options?.policy,
        });
        registeredConstructor = constructor;
      }

      Object.defineProperty(this, propertyKey, {
        enumerable: true,
        configurable: true,
        get() {
          return this[storageKey];
        },
        set(nextValue: unknown) {
          const component = this as unknown as Component;
          this[storageKey] = nextValue;

          if (component instanceof Component) {
            notifyTrackedFieldMutation(component, propertyKey);
          }
        },
      });

      this[storageKey] = initialValue;
      return initialValue;
    } as any;
  };
}

function defineTrackedField(
  target: { constructor: Function },
  propertyKey: string,
  type: SerializableType,
  options?: StateFieldOptions,
): void {
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
}

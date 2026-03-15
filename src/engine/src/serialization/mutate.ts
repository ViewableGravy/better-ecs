import type { Component } from "@engine/ecs/component";
import { notifyTrackedFieldMutation } from "@engine/serialization/serializableComponent";
import { hasSerializableField } from "@engine/serialization/state";
import invariant from "tiny-invariant";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

/**
 * Mutate a serializable field on a component, ensuring that change tracking is properly handled on nested properties. 
 * 
 * This function should only be used when mutating a property that is not primitive, to ensure that the field is marked dirty, and the change
 * is apporpriately serialized and sent to the dirty queue to be processed by the DiffManager. 
 * 
 * For primitive values, all serializable fields are already proxied with a setter that marks the field as dirty, 
 * so this function is not necessary and actively discourgaged due to the additional overhead.
 * 
 * @example
 * ```ts
 * // Mutating a primitive value - no need to use mutate, and should be avoided due to additional overhead
 * mutate(transformComponent, "pos", new Vec2(10, 20));
 * 
 * // Mutating a nested property - necessary to use mutate to ensure change tracking is handled correctly
 * mutate(transformComponent, "pos", (pos) => {
 *   pos.x = 10;
 *   pos.y = 20;
 * });
 * ```
 * 
 * @note
 * Regardless of if a value is actually set, this will mark the field as dirty, so it is recommended to check if you actually
 * want to mutate the field before mutating with the mutate function
 */
export function mutate<
  TComponent extends Component,
  TFieldKey extends Extract<keyof TComponent, string>,
>(
  component: TComponent,
  fieldKey: TFieldKey,
  nextValueOrUpdater: TComponent[TFieldKey] | ((value: TComponent[TFieldKey]) => void),
): TComponent[TFieldKey] {
  invariant(
    hasSerializableField(component.constructor as Function, fieldKey),
    `Field "${fieldKey}" is not registered with @serializable(...)`,
  );

  const componentRecord = component as unknown as Record<string, unknown>;
  const currentValue = componentRecord[fieldKey] as TComponent[TFieldKey];

  if (typeof nextValueOrUpdater === "function") {
    (nextValueOrUpdater as (value: TComponent[TFieldKey]) => void)(currentValue);
    notifyTrackedFieldMutation(component, fieldKey);
    return componentRecord[fieldKey] as TComponent[TFieldKey];
  }

  componentRecord[fieldKey] = nextValueOrUpdater;
  return componentRecord[fieldKey] as TComponent[TFieldKey];
}
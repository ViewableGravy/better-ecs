
export { DiffManager } from "@engine/serialization/diff";
export type { DiffCommand } from "@engine/serialization/diff";
export { mutate } from "@engine/serialization/mutate";
export { Queue } from "@engine/serialization/queue";
export { state } from "@engine/serialization/serializable";
export {
    StateComponent,
    applySerializedChanges,
    createSerializableComponentInstance,
    getSerializableComponentConstructor,
    isSerializableComponentInstance,
    serializeValue
} from "@engine/serialization/serializableComponent";
export type { SerializableComponentInstance } from "@engine/serialization/serializableComponent";
export type { SerializableType, SerializedObject, SerializedValue, StatePolicy } from "@engine/serialization/state";

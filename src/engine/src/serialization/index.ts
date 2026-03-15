
export { DiffManager } from "@engine/serialization/diff";
export type { DiffCommand } from "@engine/serialization/diff";
export { mutate } from "@engine/serialization/mutate";
export { Queue } from "@engine/serialization/queue";
export { serializable } from "@engine/serialization/serializable";
export {
    SerializableComponent,
    applySerializedChanges,
    createSerializableComponentInstance,
    getSerializableComponentConstructor,
    isSerializableComponentInstance,
    serializeValue
} from "@engine/serialization/serializableComponent";
export type { SerializableComponentInstance } from "@engine/serialization/serializableComponent";
export type { SerializableType, SerializedObject, SerializedValue } from "@engine/serialization/state";

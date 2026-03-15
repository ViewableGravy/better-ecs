import { z } from "zod";

import type { EntityId, SerializedObject, SerializedValue } from "@engine";
import type { SerializedSceneState } from "@libs/state-sync/scene-state/types";

const SerializedValueSchema: z.ZodType<SerializedValue> = z.lazy(() => {
  return z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(SerializedValueSchema),
    z.record(z.string(), SerializedValueSchema),
  ]);
});

const SerializedObjectSchema: z.ZodType<SerializedObject> = z.record(z.string(), SerializedValueSchema);
const EntityIdSchema = z.custom<EntityId>((value) => typeof value === "number");

export const SerializedSceneStateSchema = z.object({
  sceneName: z.string(),
  worlds: z.array(
    z.object({
      worldId: z.string(),
      world: z.object({
        sceneId: z.union([z.string(), z.null()]),
        entities: z.array(
          z.object({
            entityId: EntityIdSchema,
            components: z.array(
              z.object({
                type: z.string(),
                data: SerializedObjectSchema,
              }),
            ),
          }),
        ),
      }),
    }),
  ),
});

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function parseSerializedSceneState(value: unknown): SerializedSceneState | null {
  const parsed = SerializedSceneStateSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function isSerializedSceneState(value: unknown): value is SerializedSceneState {
  return parseSerializedSceneState(value) !== null;
}
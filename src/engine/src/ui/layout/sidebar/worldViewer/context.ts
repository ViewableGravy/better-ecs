import type { EntityId } from "@engine/ecs/entity";
import { createContext } from "react";

export const EntityIdContext = createContext<EntityId | null>(null);

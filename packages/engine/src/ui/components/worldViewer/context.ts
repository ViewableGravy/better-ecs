import { createContext } from "react";
import type { EntityId } from "../../../ecs/entity";

export const WorldIdContext = createContext<string | null>(null);
export const EntityIdContext = createContext<EntityId | null>(null);
import { createContext } from "react";
import type { EngineClass, SceneDefinitionTuple, SystemFactoryTuple } from "@engine/core";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type EngineUiContextValue = EngineClass<
	SystemFactoryTuple,
	SceneDefinitionTuple,
	Record<string, unknown>
>;


/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const EngineUiContext = createContext<EngineUiContextValue | null>(null);

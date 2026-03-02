import type { EngineSystemTypes } from "@engine/systems/engine-system-types";
import type { SceneDefinition, SceneDefinitionTuple, SceneName } from "@engine/core/scene/scene.types";
import type { SystemFactoryTuple } from "@engine/core/system/types";
import type { EngineFrame, EngineUpdate } from "@engine/core/types";

export type StartEngineOpts = {
	fps?: number;
	ups?: number;
	signal?: AbortSignal;
};

export type StartEngineGenerator = AsyncGenerator<readonly [EngineUpdate, EngineFrame], void, unknown>;

export type SystemName<TFactory> = TFactory extends {
	["~types"]: { name: infer N extends string };
}
	? N
	: never;

export type SystemsTupleToRecord<T extends SystemFactoryTuple> = {
	[Factory in T[number] as SystemName<Factory>]: ReturnType<Factory>;
};

export type FactoriesToRecord<TFactories> = {
	[Factory in Extract<
		TFactories,
		(...args: unknown[]) => unknown
	> as SystemName<Factory>]: ReturnType<Factory>;
};

export type SceneSystemFactories<T extends SceneDefinitionTuple> =
	T[number] extends SceneDefinition<string, infer TSceneSystems extends SystemFactoryTuple>
		? TSceneSystems[number]
		: never;

export type AllSystems<
	TSystems extends SystemFactoryTuple,
	TScenes extends SceneDefinitionTuple,
> =
	& SystemsTupleToRecord<TSystems>
	& FactoriesToRecord<SceneSystemFactories<TScenes>>
	& EngineSystemTypes;

export type ScenesTupleToRecord<T extends SceneDefinitionTuple> = {
	[Scene in T[number] as SceneName<Scene>]: Scene;
};

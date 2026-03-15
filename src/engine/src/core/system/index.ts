import {
    type EmptySystemState,
    type EngineInitializationSystem,
    type EngineSystem,
    type SystemFactory,
    type SystemOpts,
} from "@engine/core/system/types";

const emptySystemState: EmptySystemState = {};

export const executeSystemCleanup = (system: EngineSystem): void => {
	if (!system.react) return;

	system.react();
	system.react = undefined;
};

export const executeSystemInitialize = (system: EngineSystem): void => {
	executeSystemCleanup(system);

	if (!system.initialize) return;

	const cleanup = system.initialize();
	if (typeof cleanup === "function") {
		system.react = cleanup;
	}
};

export const createSystem = <TName extends string>(name: TName) => {
	return <TState extends object = EmptySystemState, TMethods extends Record<string, any> = object>(
		opts: SystemOpts<TState, TMethods>,
	): SystemFactory<TName, TState, TMethods> => {
		const state = (opts.state ?? emptySystemState) as TState;

		const hmr = globalThis.__ENGINE_HMR__;
		if (hmr?.onSystemCreated) {
			hmr.onSystemCreated({
				name,
				system: opts.system,
				initialize: opts.initialize,
				priority: opts.priority ?? 0,
				enabled: opts.enabled ?? true,
			});
		}

		const factory = (): EngineSystem<TState> & TMethods => {
			const system: EngineSystem<TState> = {
				name: name,
				data: state,
				priority: opts.priority ?? 0,
				enabled: opts.enabled ?? true,
				system: opts.system,
				initialize: opts.initialize,
				react: undefined,
			};

			const methods = opts.methods ? opts.methods(system) : ({} as TMethods);

			return Object.assign(system, methods);
		};

		const result: SystemFactory<TName, TState, TMethods> = Object.assign(factory, {
			["~types"]: {
				name: name,
				state,
			},
		});

		return result;
	};
};

export const createInitializationSystem = (system: () => void): EngineInitializationSystem => {
	return {
		system,
	};
};

export type {
    EmptySystemState,
    EngineInitializationSystem,
    EngineSystem,
    SystemFactory,
    SystemFactoryTuple,
    SystemOpts
} from "@engine/core/system/types";


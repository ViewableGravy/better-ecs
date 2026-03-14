export type SystemPriority = number;
export type SystemCleanup = () => void;
export type SystemInitialize = () => void | SystemCleanup;

export type EmptySystemData = Record<string, never>;
export type EmptySystemState = EmptySystemData;

export type SystemOpts<TState extends object, TMethods extends Record<string, any>> = {
	state?: TState;
	priority?: SystemPriority;
	enabled?: boolean;
	system: () => void;
	initialize?: SystemInitialize;
	methods?: (system: EngineSystem<TState>) => TMethods;
};

export type SystemFactory<
	TName extends string,
	TState extends object,
	TMethods extends Record<string, any>,
> = {
	(): EngineSystem<TState> & TMethods;
	["~types"]: {
		name: TName;
		state: TState;
	};
};

export type SystemFactoryTuple = Array<SystemFactory<string, object, Record<string, any>>>;

export type EngineSystem<TState extends object = object> = {
	name: string;
	data: TState;
	priority: SystemPriority;
	system: () => void;
	initialize?: SystemInitialize;
	react?: SystemCleanup;
	enabled: boolean;
};

export type EngineInitializationSystem = {
	system: () => Promise<void> | void;
};


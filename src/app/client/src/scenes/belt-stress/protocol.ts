export type ConfigureBeltStressSimulation = {
  readonly type: "configure";
  readonly configurationId: number;
  readonly itemCount: number;
  readonly updatesPerSecond: number;
  readonly columns: number;
  readonly itemsPerBelt: number;
  readonly beltSize: number;
  readonly ticksPerBelt: number;
  readonly transferBufferCount: number;
};

export type ReturnBeltStressBuffer = {
  readonly type: "return-buffer";
  readonly configurationId: number;
  readonly buffer: ArrayBuffer;
};

export type DisposeBeltStressSimulation = {
  readonly type: "dispose";
};

export type BeltStressSimulationRequest =
  | ConfigureBeltStressSimulation
  | ReturnBeltStressBuffer
  | DisposeBeltStressSimulation;

export type BeltStressConfigured = {
  readonly type: "configured";
  readonly configurationId: number;
  readonly itemCount: number;
  readonly beltCount: number;
  readonly rowCount: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly beltPositions: ArrayBuffer;
};

export type BeltStressSnapshot = {
  readonly type: "snapshot";
  readonly configurationId: number;
  readonly tick: number;
  readonly itemCount: number;
  readonly positions: ArrayBuffer;
  readonly simulationTimeMs: number;
  readonly skippedPublications: number;
  readonly checksum: number;
};

export type BeltStressSimulationResponse = BeltStressConfigured | BeltStressSnapshot;

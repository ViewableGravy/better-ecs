/// <reference lib="webworker" />

import {
  type BeltStressSimulationRequest,
  type BeltStressSimulationResponse,
  type ConfigureBeltStressSimulation,
} from "@legacy/scenes/belt-stress/protocol";

// The worker entry is compiled with the application's DOM libraries, so this cast establishes its actual host.
const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope;

let timer: ReturnType<typeof setInterval> | undefined;
let configuration: ConfigureBeltStressSimulation | undefined;
let availableBuffers: ArrayBuffer[] = [];
let tick = 0;
let skippedPublications = 0;
let rowCount = 0;
let itemsPerRow = 0;
let worldWidth = 0;
let worldHeight = 0;

workerScope.addEventListener("message", (event: MessageEvent<BeltStressSimulationRequest>) => {
  const message = event.data;
  if (message.type === "configure") {
    configure(message);
    return;
  }

  if (message.type === "return-buffer") {
    if (message.configurationId === configuration?.configurationId) {
      availableBuffers.push(message.buffer);
    }
    return;
  }

  dispose();
});

function configure(nextConfiguration: ConfigureBeltStressSimulation): void {
  disposeTimer();
  configuration = nextConfiguration;
  tick = 0;
  skippedPublications = 0;
  itemsPerRow = nextConfiguration.columns * nextConfiguration.itemsPerBelt;
  rowCount = Math.ceil(nextConfiguration.itemCount / itemsPerRow);
  worldWidth = nextConfiguration.columns * nextConfiguration.beltSize;
  worldHeight = rowCount * nextConfiguration.beltSize;

  const beltCount = nextConfiguration.columns * rowCount;
  const beltPositions = createBeltPositions(nextConfiguration, rowCount);
  availableBuffers = Array.from(
    { length: nextConfiguration.transferBufferCount },
    () => new ArrayBuffer(nextConfiguration.itemCount * 2 * Float32Array.BYTES_PER_ELEMENT),
  );

  post({
    type: "configured",
    configurationId: nextConfiguration.configurationId,
    itemCount: nextConfiguration.itemCount,
    beltCount,
    rowCount,
    worldWidth,
    worldHeight,
    beltPositions: requireArrayBuffer(beltPositions.buffer),
  }, [requireArrayBuffer(beltPositions.buffer)]);

  publishSnapshot();
  timer = setInterval(publishSnapshot, 1000 / nextConfiguration.updatesPerSecond);
}

function createBeltPositions(
  currentConfiguration: ConfigureBeltStressSimulation,
  currentRowCount: number,
): Float32Array {
  const positions = new Float32Array(currentConfiguration.columns * currentRowCount * 2);
  const startX = -(currentConfiguration.columns - 1) * currentConfiguration.beltSize * 0.5;
  const startY = -(currentRowCount - 1) * currentConfiguration.beltSize * 0.5;

  let writeIndex = 0;
  for (let row = 0; row < currentRowCount; row += 1) {
    for (let column = 0; column < currentConfiguration.columns; column += 1) {
      positions[writeIndex] = startX + column * currentConfiguration.beltSize;
      positions[writeIndex + 1] = startY + row * currentConfiguration.beltSize;
      writeIndex += 2;
    }
  }

  return positions;
}

function publishSnapshot(): void {
  const currentConfiguration = configuration;
  if (!currentConfiguration) {
    return;
  }

  tick += 1;
  const buffer = availableBuffers.pop();
  if (!buffer) {
    skippedPublications += 1;
    return;
  }

  const startedAt = performance.now();
  const positions = new Float32Array(buffer);
  const startX = -(currentConfiguration.columns - 1) * currentConfiguration.beltSize * 0.5;
  const startY = -(rowCount - 1) * currentConfiguration.beltSize * 0.5;
  const progressPerTick = 1 / currentConfiguration.ticksPerBelt;
  let checksum = 0;

  for (let itemIndex = 0; itemIndex < currentConfiguration.itemCount; itemIndex += 1) {
    const row = Math.floor(itemIndex / itemsPerRow);
    const rowItemIndex = itemIndex % itemsPerRow;
    const lane = rowItemIndex % 2;
    const spacedIndex = Math.floor(rowItemIndex / 2);
    const beltProgress =
      (spacedIndex * 0.25 + tick * progressPerTick) % currentConfiguration.columns;
    const positionOffset = itemIndex * 2;

    positions[positionOffset] =
      startX + beltProgress * currentConfiguration.beltSize;
    positions[positionOffset + 1] =
      startY + row * currentConfiguration.beltSize + (lane === 0 ? -5 : 5);
  }

  if (currentConfiguration.itemCount > 0) {
    const middleOffset = Math.floor(currentConfiguration.itemCount * 0.5) * 2;
    const lastOffset = (currentConfiguration.itemCount - 1) * 2;
    checksum = (positions[0] ?? 0) + (positions[middleOffset] ?? 0) + (positions[lastOffset] ?? 0);
  }

  post({
    type: "snapshot",
    configurationId: currentConfiguration.configurationId,
    tick,
    itemCount: currentConfiguration.itemCount,
    positions: buffer,
    simulationTimeMs: performance.now() - startedAt,
    skippedPublications,
    checksum,
  }, [buffer]);
}

function dispose(): void {
  disposeTimer();
  configuration = undefined;
  availableBuffers = [];
}

function disposeTimer(): void {
  if (timer === undefined) {
    return;
  }

  clearInterval(timer);
  timer = undefined;
}

function post(message: BeltStressSimulationResponse, transfer: Transferable[]): void {
  workerScope.postMessage(message, transfer);
}

function requireArrayBuffer(buffer: ArrayBufferLike): ArrayBuffer {
  if (!(buffer instanceof ArrayBuffer)) {
    throw new Error("Belt stress worker requires transferable ArrayBuffer storage.");
  }

  return buffer;
}

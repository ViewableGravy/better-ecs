import type { AnyEngine } from "@engine";
import type { FPSCounterData } from "@libs/fps/types";

type TargetRates = {
  fps: number;
  ups: number;
};

function toCustomRate(rate: number, initialRate: number): number | null {
  return rate === initialRate ? null : rate;
}

export function resolveStoredTargetRates(engine: AnyEngine, systemData: FPSCounterData): TargetRates {
  return {
    fps: systemData.customFps ?? engine.meta.initialFPS,
    ups: systemData.customUps ?? engine.meta.initialUPS,
  };
}

export function resolveEffectiveTargetRates(engine: AnyEngine, systemData: FPSCounterData): TargetRates {
  const targetRates = resolveStoredTargetRates(engine, systemData);
  if (!systemData.lockRatesToLower) {
    return targetRates;
  }

  const rate = Math.min(targetRates.fps, targetRates.ups);
  return {
    fps: rate,
    ups: rate,
  };
}

export function syncEngineTargetRates(engine: AnyEngine, systemData: FPSCounterData): void {
  const targetRates = resolveEffectiveTargetRates(engine, systemData);
  engine.meta.fps = targetRates.fps;
  engine.meta.ups = targetRates.ups;
}

export function applyConfiguredTargetRates(
  engine: AnyEngine,
  systemData: FPSCounterData,
  fps: number,
  ups: number,
): void {
  systemData.customFps = toCustomRate(fps, engine.meta.initialFPS);
  systemData.customUps = toCustomRate(ups, engine.meta.initialUPS);
  syncEngineTargetRates(engine, systemData);
}

export function applySharedTargetRate(engine: AnyEngine, systemData: FPSCounterData, rate: number): void {
  applyConfiguredTargetRates(engine, systemData, rate, rate);
}

export function collapseLockedTargetRates(engine: AnyEngine, systemData: FPSCounterData): void {
  const targetRates = resolveStoredTargetRates(engine, systemData);
  applySharedTargetRate(engine, systemData, Math.min(targetRates.fps, targetRates.ups));
}

export function resetTargetRates(engine: AnyEngine, systemData: FPSCounterData): void {
  systemData.customFps = null;
  systemData.customUps = null;
  syncEngineTargetRates(engine, systemData);
}
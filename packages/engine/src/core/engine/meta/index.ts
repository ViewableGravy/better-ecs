import type { MetaStats } from "@core/types";

export class Meta implements MetaStats {
  public updateDelta = 0;
  public frameDelta = 0;
  public phase: (phase: "update" | "render") => boolean;
  public fps = 60;
  public ups = 60;
  public initialFPS = 60;
  public initialUPS = 60;
  public updateProgress = 0;
  public lastUpdateTime = 0;

  public constructor(phaseFn: (phase: "update" | "render") => boolean) {
    this.phase = phaseFn;
  }

  public setTargetRates(fps: number, ups: number): void {
    this.fps = fps;
    this.ups = ups;
    this.initialFPS = fps;
    this.initialUPS = ups;
  }

  public setDeltas(updateDelta: number, frameDelta: number, updateTime: number): void {
    this.updateDelta = updateDelta;
    this.frameDelta = frameDelta;
    this.updateProgress = Math.min(updateDelta / updateTime, 1.0);
  }

  public markUpdated(now: number): void {
    this.lastUpdateTime = now;
  }
}

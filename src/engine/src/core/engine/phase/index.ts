export class PhaseState {
  #currentPhase: "update" | "render" | null = null;

  public readonly is = (phase: "update" | "render") => phase === this.#currentPhase;

  public setCurrent(phase: "update" | "render"): void {
    this.#currentPhase = phase;
  }

  public clear(): void {
    this.#currentPhase = null;
  }
}

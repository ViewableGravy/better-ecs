export type Observer = () => void;

export interface Subscribable {
  subscribe(observer: Observer): () => void;
}

export class ObservableState implements Subscribable {
  #observers = new Set<Observer>();

  subscribe(observer: Observer): () => void {
    this.#observers.add(observer);

    return () => {
      this.#observers.delete(observer);
    };
  }

  protected notify(): void {
    for (const observer of this.#observers) {
      observer();
    }
  }
}
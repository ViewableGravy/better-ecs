import { createAppEngine } from "@client/create-app-engine";
import "@client/styles.css";

declare module "@engine" {
  interface Register {
    Engine: ReturnType<typeof createAppEngine>;
  }
}

async function main(): Promise<void> {
  const engine = createAppEngine();

  for await (const _tick of engine.startEngine({ fps: 120, ups: 60 })) {
    // Engine systems and render passes own the update and frame work.
    void _tick;
  }
}

void main();

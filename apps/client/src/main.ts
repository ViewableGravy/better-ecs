// apps/client/src/main.ts
import { createAppEngine } from "./create-app-engine";
import "./styles.css";

declare module "@repo/engine" {
  interface Register {
    Engine: ReturnType<typeof createAppEngine>;
  }
}

async function main() {
  const engine = createAppEngine();

  // Start application
  // prettier-ignore
  for await (const [update, frame] of engine.startEngine({ fps: 60, ups: 10 })) {
    if (update.shouldUpdate) {
      // Update phase - run update logic
    }

    if (frame.shouldUpdate) {
      // Render phase - run render logic
    }
  }
}

main();

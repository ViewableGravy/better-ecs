// apps/client/src/main.ts
import { createAppEngine } from "@client/create-app-engine";
import "@client/styles.css";

declare module "@engine" {
  interface Register {
    Engine: ReturnType<typeof createAppEngine>;
  }
}

async function main() {
  const engine = createAppEngine();

  // Start application
  for await (const [update, frame] of engine.startEngine({ fps: 120, ups: 120 })) {
    if (update.shouldUpdate) {
      // Update phase - run update logic
    }

    if (frame.shouldUpdate) {
      // Render phase - run render logic
    }
  }
}

main();

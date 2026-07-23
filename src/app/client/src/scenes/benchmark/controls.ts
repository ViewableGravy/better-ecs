import {
  BENCHMARK_ENTITY_COUNTS,
  BENCHMARK_PROFILE_ID,
} from "@client/scenes/benchmark/config";
import type { BenchmarkController } from "@client/scenes/benchmark/controller";
import type { BenchmarkRunResult, BenchmarkStatus } from "@client/scenes/benchmark/types";
import type { AnyEngine } from "@engine";

export function mountBenchmarkControls(
  controller: BenchmarkController,
  engine: AnyEngine,
): () => void {
  const root = document.createElement("section");
  root.id = "benchmark-controls";
  root.style.cssText = [
    "position:absolute",
    "top:10px",
    "right:10px",
    "z-index:1000",
    "width:330px",
    "padding:12px",
    "border-radius:8px",
    "background:rgba(12, 16, 24, 0.92)",
    "color:#f6f7fb",
    "font:13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
    "box-shadow:0 8px 30px rgba(0, 0, 0, 0.35)",
  ].join(";");
  root.innerHTML = `
    <div style="font-weight:700; margin-bottom:4px;">Stress profiler</div>
    <div style="color:#aeb8ca; margin-bottom:10px;">${BENCHMARK_PROFILE_ID}</div>
    <div id="benchmark-targets" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
    <button id="benchmark-run" style="margin-top:10px; padding:5px 9px;">Run current sample</button>
    <pre id="benchmark-status" style="margin:10px 0 0; white-space:pre-wrap;"></pre>
    <pre id="benchmark-result" style="margin:10px 0 0; white-space:pre-wrap; color:#9ee6b8;"></pre>
  `;

  const parent = engine.canvas.parentElement;
  if (!parent) {
    throw new Error("Engine canvas must have a parent element for benchmark controls.");
  }
  parent.append(root);

  const targetsRoot = requireElement(root, "benchmark-targets");
  const runButton = requireButton(root, "benchmark-run");
  const statusElement = requireElement(root, "benchmark-status");
  const resultElement = requireElement(root, "benchmark-result");
  const targetButtons: HTMLButtonElement[] = [];

  for (const target of BENCHMARK_ENTITY_COUNTS) {
    const button = document.createElement("button");
    button.textContent = formatCount(target);
    button.dataset.benchmarkTarget = String(target);
    button.style.cssText = "padding:4px 7px;";
    button.onclick = () => {
      void controller.configure(target).catch((error) => {
        console.error(`[BenchmarkScene] Failed to configure ${target} entities.`, error);
      });
    };
    targetsRoot.append(button);
    targetButtons.push(button);
  }

  runButton.onclick = () => {
    const target = controller.status().requestedCount;
    void controller.run(target).then(renderResult).catch((error) => {
      console.error(`[BenchmarkScene] Failed to sample ${target} entities.`, error);
    });
  };

  controller.setStatusListener(renderStatus);

  function renderStatus(status: BenchmarkStatus): void {
    const busy = status.phase === "constructing"
      || status.phase === "warming-up"
      || status.phase === "sampling";

    for (const button of targetButtons) {
      button.disabled = busy;
    }
    runButton.disabled = busy || status.phase !== "ready";

    const progress = status.createdCount / status.requestedCount * 100;

    statusElement.textContent = [
      `phase: ${status.phase}`,
      `target: ${status.requestedCount.toLocaleString()}`,
      `created: ${status.createdCount.toLocaleString()} (${progress.toFixed(1)}%)`,
      `last entity index: ${status.lastEntityIndex?.toLocaleString() ?? "none"}`,
      `animated/tick: ${status.animatedCount.toLocaleString()}`,
      `construction CPU: ${status.constructionCpuMs.toFixed(1)} ms`,
      `time to interactive: ${status.constructionWallMs.toFixed(1)} ms`,
      ...(status.error ? [`error: ${status.error}`] : []),
    ].join("\n");

    const result = controller.result();
    if (result) {
      renderResult(result);
    }
  }

  function renderResult(result: BenchmarkRunResult): void {
    resultElement.textContent = [
      `RAF fps avg: ${result.raf.fpsAverage.toFixed(2)}`,
      `RAF interval avg: ${result.raf.frameTimeAverageMs.toFixed(2)} ms`,
      `RAF p95 / p99: ${result.raf.frameTimeP95Ms.toFixed(2)} / ${result.raf.frameTimeP99Ms.toFixed(2)} ms`,
      `RAF samples: ${result.raf.capturedFrames}/${result.raf.requestedFrames}`,
      `update ticks: ${result.updateTicks}`,
      `motion updates: ${result.motionUpdates}`,
      `checksum: ${result.checksumBefore.toFixed(2)} -> ${result.checksumAfter.toFixed(2)}`,
      `timed out: ${String(result.raf.timedOut)}`,
    ].join("\n");
  }

  return () => {
    root.remove();
  };
}

function requireElement(parent: ParentNode, id: string): HTMLElement {
  const element = parent.querySelector<HTMLElement>(`#${id}`);
  if (!element) {
    throw new Error(`Benchmark control "${id}" was not mounted.`);
  }
  return element;
}

function requireButton(parent: ParentNode, id: string): HTMLButtonElement {
  const element = parent.querySelector<HTMLButtonElement>(`#${id}`);
  if (!element) {
    throw new Error(`Benchmark button "${id}" was not mounted.`);
  }
  return element;
}

function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${count / 1_000_000}M`;
  }

  return `${count / 1_000}k`;
}

import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { chromium, type Browser, type Page } from "@playwright/test";
import { build, preview, type PreviewServer } from "vite";
import {
  BENCHMARK_ENTITY_COUNTS,
  DEFAULT_BENCHMARK_SAMPLE_FRAMES,
  DEFAULT_BENCHMARK_TIMEOUT_MS,
  DEFAULT_BENCHMARK_WARMUP_FRAMES,
  type BenchmarkEntityCount,
} from "@client/scenes/benchmark/config";
import type {
  BenchmarkRunResult,
  BenchmarkStatus,
} from "@client/scenes/benchmark/types";

const OUTPUT_DIRECTORY = "benchmark-results";
const EXTERNAL_BENCHMARK_URL = process.env.BENCHMARK_URL;
const PREVIEW_URL = "http://127.0.0.1:4173";
const SMOKE_TARGETS: readonly BenchmarkEntityCount[] = [10_000];
const smoke = process.argv.includes("--smoke");
const targets = smoke ? SMOKE_TARGETS : BENCHMARK_ENTITY_COUNTS;
const warmupFrames = smoke ? 5 : DEFAULT_BENCHMARK_WARMUP_FRAMES;
const sampleFrames = smoke ? 10 : DEFAULT_BENCHMARK_SAMPLE_FRAMES;
const timeoutMs = smoke ? 15_000 : DEFAULT_BENCHMARK_TIMEOUT_MS;

type HeapUsage = {
  usedSize: number;
  totalSize: number;
  embedderHeapUsedSize: number;
  backingStorageSize: number;
};

type BrowserMetadata = {
  userAgent: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  renderer: string;
  vendor: string;
  webgl2: boolean;
};

type ScenarioReport = {
  target: BenchmarkEntityCount;
  outcome: "passed" | "failed" | "browser-failed";
  checks: string[];
  errors: string[];
  status: BenchmarkStatus | null;
  result: BenchmarkRunResult | null;
  heapBefore: HeapUsage | null;
  heapAfter: HeapUsage | null;
  metadata: BrowserMetadata | null;
};

type StressReport = {
  startedAt: string;
  finishedAt: string | null;
  baseUrl: string;
  browserVersion: string;
  warmupFrames: number;
  sampleFrames: number;
  timeoutMs: number;
  scenarios: ScenarioReport[];
};

let previewServer: PreviewServer | null = null;
const baseUrl = await resolveBenchmarkUrl();
const report: StressReport = {
  startedAt: new Date().toISOString(),
  finishedAt: null,
  baseUrl,
  browserVersion: "",
  warmupFrames,
  sampleFrames,
  timeoutMs,
  scenarios: [],
};

const outputPath = `${OUTPUT_DIRECTORY}/stress-${report.startedAt.replaceAll(":", "-")}.json`;
await mkdir(OUTPUT_DIRECTORY, { recursive: true });

let browser: Browser | null = null;

try {
  browser = await chromium.launch({
    headless: true,
    args: ["--enable-precise-memory-info"],
  });
  report.browserVersion = browser.version();

  for (const target of targets) {
    const scenario = await runScenario(browser, target);
    report.scenarios.push(scenario);
    await persistReport();

    const detail = scenario.errors[0] ?? scenario.result?.raf.frameTimeP95Ms.toFixed(2);
    console.info(`[stress] ${target.toLocaleString()}: ${scenario.outcome}${detail ? ` (${detail})` : ""}`);
  }
} finally {
  await browser?.close();
  await previewServer?.close();
  report.finishedAt = new Date().toISOString();
  await persistReport();
}

const failed = report.scenarios.some((scenario) => scenario.outcome !== "passed");
console.info(`[stress] report: ${outputPath}`);
process.exit(failed ? 1 : 0);

async function runScenario(browserInstance: Browser, target: BenchmarkEntityCount): Promise<ScenarioReport> {
  const context = await browserInstance.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    page.setDefaultTimeout(timeoutMs * 3);
    await page.goto(`${baseUrl}/?benchmark=stress&benchmarkTarget=${target}`, {
      waitUntil: "load",
      timeout: timeoutMs * 3,
    });
    await page.waitForFunction(() => Boolean(window.__BETTER_ECS_BENCH__));
    await page.waitForFunction(() => {
      const phase = window.__BETTER_ECS_BENCH__?.status().phase;
      return phase === "ready" || phase === "failed";
    });

    const status = await readStatus(page);
    const metadata = await readMetadata(page);
    const heapBefore = await readHeapUsage(page);

    if (status.phase === "failed") {
      return {
        target,
        outcome: "failed",
        checks: [],
        errors: [status.error ?? "Benchmark construction failed without an error message.", ...pageErrors],
        status,
        result: null,
        heapBefore,
        heapAfter: await readHeapUsage(page),
        metadata,
      };
    }

    const result = await withPageDeadline(
      page,
      page.evaluate(
        ({ count, sampleFrames, timeoutMs, warmupFrames }) => {
          const harness = window.__BETTER_ECS_BENCH__;
          if (!harness) {
            throw new Error("Benchmark harness is not installed.");
          }

          return harness.run(count, { sampleFrames, timeoutMs, warmupFrames });
        },
        {
          count: target,
          sampleFrames,
          timeoutMs,
          warmupFrames,
        },
      ),
      timeoutMs * 2 + 10_000,
    );
    const heapAfter = await readHeapUsage(page);
    const checks = checkResult(result);
    const errors = [...pageErrors];

    if (checks.length !== 0) {
      errors.push(...checks);
    }

    return {
      target,
      outcome: errors.length === 0 ? "passed" : "failed",
      checks: [
        "created count matches target",
        "animated count matches dynamic-50 profile",
        "update tick advanced",
        "motion system advanced",
        "RAF pacing sample is finite and complete",
        "no page errors",
      ],
      errors,
      status: await readStatus(page),
      result,
      heapBefore,
      heapAfter,
      metadata,
    };
  } catch (error) {
    return {
      target,
      outcome: "browser-failed",
      checks: [],
      errors: [error instanceof Error ? error.message : String(error), ...pageErrors],
      status: await readStatusIfAvailable(page),
      result: null,
      heapBefore: null,
      heapAfter: null,
      metadata: null,
    };
  } finally {
    await context.close();
  }
}

function checkResult(result: BenchmarkRunResult): string[] {
  const errors: string[] = [];

  if (result.createdCount !== result.targetCount) {
    errors.push(`Created ${result.createdCount} of ${result.targetCount} entities.`);
  }

  if (result.animatedCount !== Math.ceil(result.targetCount / 2)) {
    errors.push(`Animated count ${result.animatedCount} does not match the dynamic-50 profile.`);
  }

  if (result.updateTicks < 1) {
    errors.push("No update tick completed during the sample.");
  }

  if (result.motionUpdates < 1) {
    errors.push("The benchmark motion system did not run during the sample.");
  }

  if (result.raf.capturedFrames !== result.raf.requestedFrames || result.raf.timedOut) {
    errors.push(
      `Captured ${result.raf.capturedFrames}/${result.raf.requestedFrames} RAF intervals`
      + `${result.raf.timedOut ? " before timeout" : ""}.`,
    );
  }

  const metrics = [
    result.raf.durationMs,
    result.raf.fpsAverage,
    result.raf.frameTimeAverageMs,
    result.raf.frameTimeMedianMs,
    result.raf.frameTimeP95Ms,
    result.raf.frameTimeP99Ms,
    result.raf.frameTimeMaxMs,
    result.constructionCpuMs,
    result.constructionWallMs,
    result.checksumBefore,
    result.checksumAfter,
  ];

  if (metrics.some((value) => !Number.isFinite(value))) {
    errors.push("The sample contains a non-finite metric.");
  }

  return errors;
}

async function readStatus(page: Page): Promise<BenchmarkStatus> {
  return page.evaluate(() => {
    const harness = window.__BETTER_ECS_BENCH__;
    if (!harness) {
      throw new Error("Benchmark harness is not installed.");
    }
    return harness.status();
  });
}

async function readStatusIfAvailable(page: Page): Promise<BenchmarkStatus | null> {
  if (page.isClosed()) {
    return null;
  }

  return page.evaluate(() => window.__BETTER_ECS_BENCH__?.status() ?? null).catch(() => null);
}

async function readHeapUsage(page: Page): Promise<HeapUsage> {
  const session = await page.context().newCDPSession(page);
  try {
    return await session.send("Runtime.getHeapUsage");
  } finally {
    await session.detach();
  }
}

async function readMetadata(page: Page): Promise<BrowserMetadata> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Engine canvas was not found.");
    }

    const gl = canvas.getContext("webgl2");
    if (!gl) {
      return {
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
        renderer: "unavailable",
        vendor: "unavailable",
        webgl2: false,
      };
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      renderer: debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : "masked",
      vendor: debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)) : "masked",
      webgl2: true,
    };
  });
}

async function persistReport(): Promise<void> {
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function withPageDeadline<T>(page: Page, operation: Promise<T>, deadlineMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      void page.close();
      reject(new Error(`Browser scenario exceeded the ${deadlineMs} ms process-side deadline.`));
    }, deadlineMs);
  });

  try {
    return await Promise.race([operation, deadline]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function resolveBenchmarkUrl(): Promise<string> {
  if (EXTERNAL_BENCHMARK_URL) {
    return EXTERNAL_BENCHMARK_URL;
  }

  console.info("[stress] building production client");
  await build({ configFile: "vite.config.ts" });
  previewServer = await preview({
    configFile: "vite.config.ts",
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
  });
  console.info(`[stress] production preview: ${PREVIEW_URL}`);
  return PREVIEW_URL;
}

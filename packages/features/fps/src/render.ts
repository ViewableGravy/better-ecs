import { useEngine, useOverloadedSystem, type EngineSystem } from "@repo/engine";
import { schema, type Opts } from "./types";

export function render(opts: Opts) {
  const now = performance.now();
  const engine = useEngine();
  const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("plugin:fps-counter");
  const fpsBufferStart = data.fpsBuffer.start;
  if (fpsBufferStart === null) {
    data.fpsBuffer.start = now;
    return;
  }

  data.fpsBuffer.frames++;

  if (fpsBufferStart + 1000 > now) return;

  // Check if 1 second has passed (FPS calculation in render phase)
  const elapsedSec = (now - fpsBufferStart) / 1000;

  // Start collecting samples immediately (no wait period)
  data.fps.push(data.fpsBuffer.frames / elapsedSec);

  // Keep only the last barCount entries
  if (data.fps.length > (opts.barCount ?? 60)) data.fps.shift();

  // Reset FPS buffer
  data.fpsBuffer.start = now;
  data.fpsBuffer.frames = 0;

  // Update UI
  if (data.fps.length === 0) return;

  const fps = data.fps;
  const ups = data.ups;
  const currentFps = fps[fps.length - 1];
  const currentUps = ups.length > 0 ? ups[ups.length - 1] : 0;

  // Use custom values if set, otherwise use engine defaults
  const targetFps = data.customFps ?? engine.frame.fps ?? 60;
  const targetUps = data.customUps ?? engine.frame.ups ?? 60;

  // Update based on mode
  if (data.mode === "simple") {
    setVal("#fps-simple", opts.element, currentFps);
    setVal("#fps-target-simple", opts.element, `/${targetFps}`);
    setVal("#ups-simple", opts.element, currentUps);
    setVal("#ups-target-simple", opts.element, `/${targetUps}`);
    return;
  }

  // Default and Advanced modes show the same header stats
  setVal("#fps-current", opts.element, currentFps);

  // Frame Time calculation (from current FPS)
  const frameTime = 1000 / (currentFps || 60);
  setVal("#frametime-value", opts.element, frameTime.toFixed(1));

  // Sort for percentiles
  const sortedFps = [...fps].sort((a, b) => a - b);

  const [min] = sortedFps;
  const max = sortedFps[sortedFps.length - 1];
  const avg = fps.reduce((a, b) => a + b, 0) / fps.length;

  // 1% low
  const index1Low = Math.floor(sortedFps.length * 0.01);
  const low1 = sortedFps[Math.max(0, index1Low)];

  // 0.1% low
  const index01Low = Math.floor(sortedFps.length * 0.001);
  const low01 = sortedFps[Math.max(0, index01Low)];

  setVal("#val-avg", opts.element, avg);
  setVal("#val-max", opts.element, max);
  setVal("#val-min", opts.element, min);
  setVal("#val-1low", opts.element, low1);
  setVal("#val-01low", opts.element, low01);
  const barScale = targetFps;

  setBar("#bar-avg", opts.element, avg, barScale);
  setBar("#bar-max", opts.element, max, barScale);
  setBar("#bar-min", opts.element, min, barScale);
  setBar("#bar-1low", opts.element, low1, barScale);
  setBar("#bar-01low", opts.element, low01, barScale);

  // Advanced mode: Update target displays and sync sliders only if needed
  if (data.mode === "advanced") {
    setVal("#fps-target-value", opts.element, targetFps);
    setVal("#ups-target-value", opts.element, targetUps);

    // Only update sliders if the stored value changed (not on every render)
    // This prevents resetting user input while they're dragging
    const fpsSlider = opts.element.querySelector("#fps-slider") as HTMLInputElement;
    const upsSlider = opts.element.querySelector("#ups-slider") as HTMLInputElement;

    if (fpsSlider && !fpsSlider.matches(":active") && fpsSlider.value !== targetFps.toString()) {
      fpsSlider.value = targetFps.toString();
      updateSliderFill(fpsSlider, opts.element);
    }

    if (upsSlider && !upsSlider.matches(":active") && upsSlider.value !== targetUps.toString()) {
      upsSlider.value = targetUps.toString();
      updateSliderFill(upsSlider, opts.element);
    }
  }
}

function updateSliderFill(slider: HTMLInputElement, container: HTMLElement) {
  const value = parseInt(slider.value);
  const defaultValue = 60; // Default FPS/UPS
  const max = parseInt(slider.max);
  const percentage = (value / max) * 100;

  const fillId = slider.id === "fps-slider" ? "#fps-slider-fill" : "#ups-slider-fill";
  const fill = container.querySelector(fillId) as HTMLElement;

  if (fill) {
    fill.style.width = `${percentage}%`;

    // Set color based on value vs default
    if (value === defaultValue) {
      fill.style.backgroundColor = "var(--label-grey)";
    } else if (value > defaultValue) {
      fill.style.backgroundColor = "var(--label-green)";
    } else {
      fill.style.backgroundColor = "var(--label-orange)";
    }
  }
}

function setVal(id: string, element: HTMLElement, val: number | string) {
  const el = element.querySelector<HTMLElement>(id);
  if (!el) return;
  el.textContent = typeof val === "number" ? Math.round(val).toString() : val;
}

function setBar(id: string, element: HTMLElement, val: number, maxVal: number) {
  const el = element.querySelector<HTMLElement>(id);
  if (!el) return;
  const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
  el.style.setProperty("--bar-width", `${pct}%`);
}

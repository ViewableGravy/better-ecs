import type { AnyEngine, EngineSystem } from "@engine";
import { Engine, fromContext, OverrideSystem, System } from "@engine/context";
import { updateModeVisibility } from "@libs/fps/initialize";
import type { FPSCounterData, Opts } from "@libs/fps/types";
import invariant from "tiny-invariant";

const SLIDER_INIT_ATTR = "data-fps-sliders-initialized";

export function update(opts: Opts) {
  const { data } = fromContext(OverrideSystem<EngineSystem<FPSCounterData>>("plugin:fps-counter"));
  const engine = fromContext(Engine);
  const now = performance.now();

  // Cycle through modes via engine input if a keybind was provided
  if (opts.modeToggleKey) {
    const input = fromContext(System("engine:input"));
    if (input.matchKeybind({ state: "pressed" })(opts.modeToggleKey)) {
      const modes: Array<"disabled" | "simple" | "default" | "advanced"> = [
        "disabled",
        "simple",
        "default",
        "advanced",
      ];
      const currentIndex = modes.indexOf(data.mode);
      const nextIndex = (currentIndex + 1) % modes.length;
      data.mode = modes[nextIndex];

      // Update the container data attribute
      const container = opts.element.querySelector("aside");
      if (container) {
        container.setAttribute("data-mode", data.mode);
        updateModeVisibility(container, data.mode);
      }
    }
  }

  // Initialize slider event listeners in advanced mode
  if (data.mode === "advanced") {
    const container = opts.element.querySelector("aside");
    if (container && !container.hasAttribute(SLIDER_INIT_ATTR)) {
      initializeSliders(opts.element, data, engine);
      container.setAttribute(SLIDER_INIT_ATTR, "true");
    }
  }

  data.upsBuffer.updates++;

  const upsBufferStart = data.upsBuffer.start;
  invariant(upsBufferStart, "UPS buffer start time must be initialized before update ticks");

  // Check if rate has passed (UPS calculation in update phase)
  if (upsBufferStart + 1000 > now) return;

  const elapsedSec = (now - upsBufferStart) / 1000;
  data.ups.push(data.upsBuffer.updates / elapsedSec);

  // Keep only the last barCount entries
  if (data.ups.length > (opts.barCount ?? 60)) data.ups.shift();

  // Reset UPS buffer
  data.upsBuffer.start = now;
  data.upsBuffer.updates = 0;
}

function initializeSliders(container: HTMLElement, systemData: any, engine: AnyEngine) {
  const fpsSlider = container.querySelector("#fps-slider") as HTMLInputElement;
  const upsSlider = container.querySelector("#ups-slider") as HTMLInputElement;
  const fpsReset = container.querySelector('[data-target="fps"]') as HTMLButtonElement;
  const upsReset = container.querySelector('[data-target="ups"]') as HTMLButtonElement;

  if (fpsSlider) {
    // Initialize value from engine
    fpsSlider.value = engine.meta.fps.toString();
    const valueEl = container.querySelector("#fps-target-value");
    if (valueEl) valueEl.textContent = engine.meta.fps.toString();
    updateSliderFill(fpsSlider, container, engine.meta.initialFPS);

    fpsSlider.addEventListener("input", (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      systemData.customFps = value;
      engine.meta.fps = value;
      const valueEl = container.querySelector("#fps-target-value");
      if (valueEl) valueEl.textContent = value.toString();
      updateSliderFill(fpsSlider, container, engine.meta.initialFPS);
    });
  }

  if (upsSlider) {
    // Initialize value from engine
    upsSlider.value = engine.meta.ups.toString();
    const valueEl = container.querySelector("#ups-target-value");
    if (valueEl) valueEl.textContent = engine.meta.ups.toString();
    updateSliderFill(upsSlider, container, engine.meta.initialUPS);

    upsSlider.addEventListener("input", (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      systemData.customUps = value;
      engine.meta.ups = value;
      const valueEl = container.querySelector("#ups-target-value");
      if (valueEl) valueEl.textContent = value.toString();
      updateSliderFill(upsSlider, container, engine.meta.initialUPS);
    });
  }

  if (fpsReset) {
    fpsReset.addEventListener("click", () => {
      systemData.customFps = null; // Reset to use engine default
      engine.meta.fps = engine.meta.initialFPS; // Reset engine to default
      if (fpsSlider) {
        const defaultValue = engine.meta.initialFPS;
        fpsSlider.value = defaultValue.toString();
        const valueEl = container.querySelector("#fps-target-value");
        if (valueEl) valueEl.textContent = defaultValue.toString();
        updateSliderFill(fpsSlider, container, defaultValue);
      }
    });
  }

  if (upsReset) {
    upsReset.addEventListener("click", () => {
      systemData.customUps = null; // Reset to use engine default
      engine.meta.ups = engine.meta.initialUPS; // Reset engine to default
      if (upsSlider) {
        const defaultValue = engine.meta.initialUPS;
        upsSlider.value = defaultValue.toString();
        const valueEl = container.querySelector("#ups-target-value");
        if (valueEl) valueEl.textContent = defaultValue.toString();
        updateSliderFill(upsSlider, container, defaultValue);
      }
    });
  }
}

function updateSliderFill(slider: HTMLInputElement, container: HTMLElement, defaultValue: number) {
  const value = parseInt(slider.value);
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

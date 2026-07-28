import type { AnyEngine, EngineSystem } from "@engine";
import { Engine, fromContext, OverrideSystem, System } from "@engine/context";
import { updateModeVisibility } from "@libs/fps/initialize";
import {
    applyConfiguredTargetRates,
    applySharedTargetRate,
    collapseLockedTargetRates,
    resetTargetRates,
    resolveEffectiveTargetRates,
    resolveStoredTargetRates,
} from "@libs/fps/rates";
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

function initializeSliders(container: HTMLElement, systemData: FPSCounterData, engine: AnyEngine) {
  const fpsSlider = container.querySelector("#fps-slider") as HTMLInputElement;
  const upsSlider = container.querySelector("#ups-slider") as HTMLInputElement;
  const lockToggle = container.querySelector("#rate-lock-toggle") as HTMLInputElement;
  const fpsReset = container.querySelector('[data-target="fps"]') as HTMLButtonElement;
  const upsReset = container.querySelector('[data-target="ups"]') as HTMLButtonElement;

  syncRateControls(container, systemData, engine);

  if (lockToggle) {
    lockToggle.checked = systemData.lockRatesToLower;
    lockToggle.addEventListener("change", (event) => {
      const nextChecked = (event.target as HTMLInputElement).checked;
      systemData.lockRatesToLower = nextChecked;

      if (nextChecked) {
        collapseLockedTargetRates(engine, systemData);
      } else {
        const targetRates = resolveEffectiveTargetRates(engine, systemData);
        engine.meta.fps = targetRates.fps;
        engine.meta.ups = targetRates.ups;
      }

      syncRateControls(container, systemData, engine);
    });
  }

  if (fpsSlider) {
    fpsSlider.addEventListener("input", (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);

      if (systemData.lockRatesToLower) {
        applySharedTargetRate(engine, systemData, value);
      } else {
        const { ups } = resolveStoredTargetRates(engine, systemData);
        applyConfiguredTargetRates(engine, systemData, value, ups);
      }

      syncRateControls(container, systemData, engine);
    });
  }

  if (upsSlider) {
    upsSlider.addEventListener("input", (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);

      if (systemData.lockRatesToLower) {
        applySharedTargetRate(engine, systemData, value);
      } else {
        const { fps } = resolveStoredTargetRates(engine, systemData);
        applyConfiguredTargetRates(engine, systemData, fps, value);
      }

      syncRateControls(container, systemData, engine);
    });
  }

  if (fpsReset) {
    fpsReset.addEventListener("click", () => {
      if (systemData.lockRatesToLower) {
        resetTargetRates(engine, systemData);
        collapseLockedTargetRates(engine, systemData);
      } else {
        const { ups } = resolveStoredTargetRates(engine, systemData);
        applyConfiguredTargetRates(engine, systemData, engine.meta.initialFPS, ups);
      }

      syncRateControls(container, systemData, engine);
    });
  }

  if (upsReset) {
    upsReset.addEventListener("click", () => {
      if (systemData.lockRatesToLower) {
        resetTargetRates(engine, systemData);
        collapseLockedTargetRates(engine, systemData);
      } else {
        const { fps } = resolveStoredTargetRates(engine, systemData);
        applyConfiguredTargetRates(engine, systemData, fps, engine.meta.initialUPS);
      }

      syncRateControls(container, systemData, engine);
    });
  }
}

function syncRateControls(container: HTMLElement, systemData: FPSCounterData, engine: AnyEngine): void {
  const targetRates = resolveEffectiveTargetRates(engine, systemData);
  const fpsSlider = container.querySelector("#fps-slider") as HTMLInputElement | null;
  const upsSlider = container.querySelector("#ups-slider") as HTMLInputElement | null;
  const lockToggle = container.querySelector("#rate-lock-toggle") as HTMLInputElement | null;
  const fpsValue = container.querySelector("#fps-target-value");
  const upsValue = container.querySelector("#ups-target-value");

  if (fpsSlider) {
    fpsSlider.value = targetRates.fps.toString();
    updateSliderFill(fpsSlider, container, engine.meta.initialFPS);
  }

  if (upsSlider) {
    upsSlider.value = targetRates.ups.toString();
    updateSliderFill(upsSlider, container, engine.meta.initialUPS);
  }

  if (fpsValue) {
    fpsValue.textContent = targetRates.fps.toString();
  }

  if (upsValue) {
    upsValue.textContent = targetRates.ups.toString();
  }

  if (lockToggle) {
    lockToggle.checked = systemData.lockRatesToLower;
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

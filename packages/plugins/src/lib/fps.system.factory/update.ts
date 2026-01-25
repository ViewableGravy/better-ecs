import type { Opts } from "./types";
import { schema } from "./types"
import { useOverloadedSystem, useSystem, useEngine } from "@repo/engine";
import type { EngineSystem, AnyEngine } from "@repo/engine";

let slidersInitialized = false;

export function update(opts: Opts) {
  const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("plugin:fps-counter");
  const engine = useEngine();
  const now = performance.now();

  // Cycle through modes via engine input if a keybind was provided
  if (opts.modeToggleKey) {
    const input = useSystem("engine:input") as any;
    if (input.matchKeybind({ state: 'pressed' })(opts.modeToggleKey)) {
      // Cycle: simple -> default -> advanced -> simple
      const modes: Array<"simple" | "default" | "advanced"> = ["simple", "default", "advanced"];
      const currentIndex = modes.indexOf(data.mode);
      const nextIndex = (currentIndex + 1) % modes.length;
      data.mode = modes[nextIndex];
      
      // Update the container data attribute
      const container = opts.element.querySelector('.FPS__container');
      if (container) {
        container.setAttribute('data-mode', data.mode);
      }
    }
  }

  // Initialize slider event listeners in advanced mode
  if (data.mode === "advanced" && !slidersInitialized) {
    initializeSliders(opts.element, data, engine);
    slidersInitialized = true;
  }

  data.upsBuffer.updates++;

  // Check if rate has passed (UPS calculation in update phase)
  if (data.upsBuffer.start! + 1000 > now) return;

  const elapsedSec = (now - data.upsBuffer.start!) / 1000;
  data.ups.push(data.upsBuffer.updates / elapsedSec);

  // Keep only the last barCount entries
  if (data.ups.length > (opts.barCount ?? 60)) data.ups.shift();
  
  // Reset UPS buffer
  data.upsBuffer.start = now;
  data.upsBuffer.updates = 0;
}

function initializeSliders(container: HTMLElement, systemData: any, engine: AnyEngine) {
  const fpsSlider = container.querySelector('#fps-slider') as HTMLInputElement;
  const upsSlider = container.querySelector('#ups-slider') as HTMLInputElement;
  const fpsReset = container.querySelector('[data-target="fps"]') as HTMLButtonElement;
  const upsReset = container.querySelector('[data-target="ups"]') as HTMLButtonElement;

  if (fpsSlider) {
    fpsSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      systemData.customFps = value;
      engine.frame.fps = value;
      const valueEl = container.querySelector('#fps-target-value');
      if (valueEl) valueEl.textContent = value.toString();
      updateSliderFill(fpsSlider, container);
    });
  }

  if (upsSlider) {
    upsSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      systemData.customUps = value;
      engine.frame.ups = value;
      const valueEl = container.querySelector('#ups-target-value');
      if (valueEl) valueEl.textContent = value.toString();
      updateSliderFill(upsSlider, container);
    });
  }

  if (fpsReset) {
    fpsReset.addEventListener('click', () => {
      systemData.customFps = null; // Reset to use engine default
      engine.frame.fps = 60; // Reset engine to default
      if (fpsSlider) {
        const defaultValue = 60; // Will be overridden by engine value on next render
        fpsSlider.value = defaultValue.toString();
        const valueEl = container.querySelector('#fps-target-value');
        if (valueEl) valueEl.textContent = defaultValue.toString();
        updateSliderFill(fpsSlider, container);
      }
    });
  }

  if (upsReset) {
    upsReset.addEventListener('click', () => {
      systemData.customUps = null; // Reset to use engine default
      engine.frame.ups = 60; // Reset engine to default
      if (upsSlider) {
        const defaultValue = 60; // Will be overridden by engine value on next render
        upsSlider.value = defaultValue.toString();
        const valueEl = container.querySelector('#ups-target-value');
        if (valueEl) valueEl.textContent = defaultValue.toString();
        updateSliderFill(upsSlider, container);
      }
    });
  }
}


function updateSliderFill(slider: HTMLInputElement, container: HTMLElement) {
  const value = parseInt(slider.value);
  const defaultValue = 60; // Default FPS/UPS
  const max = parseInt(slider.max);
  const percentage = (value / max) * 100;
  
  const fillId = slider.id === 'fps-slider' ? '#fps-slider-fill' : '#ups-slider-fill';
  const fill = container.querySelector(fillId) as HTMLElement;
  
  if (fill) {
    fill.style.width = `${percentage}%`;
    
    // Set color based on value vs default
    if (value === defaultValue) {
      fill.style.backgroundColor = 'var(--label-grey)';
    } else if (value > defaultValue) {
      fill.style.backgroundColor = 'var(--label-green)';
    } else {
      fill.style.backgroundColor = 'var(--label-orange)';
    }
  }
}
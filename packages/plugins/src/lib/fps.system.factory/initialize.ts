import './fps-counter.css';
import { useOverloadedSystem } from "@repo/engine";
import type { EngineSystem } from "@repo/engine";
import { schema } from "./types";

// Inject CSS if not already injected
if (!document.getElementById('fps-counter-styles')) {
  const style = document.createElement('style');
  style.id = 'fps-counter-styles';
  document.head.appendChild(style);
}

export function initialize(element: HTMLElement) {
  element.innerHTML = /* html */`
    <aside class="FPS__container" data-mode="default">
      
      <!-- Simple Mode View -->
      <div class="FPS__simple-view">
        <div class="FPS__simple-metric">
          <div class="FPS__simple-current" id="fps-simple">60</div>
          <div class="FPS__simple-target" id="fps-target-simple">/60</div>
        </div>
        <div class="FPS__simple-separator">|</div>
        <div class="FPS__simple-metric">
          <div class="FPS__simple-current" id="ups-simple">60</div>
          <div class="FPS__simple-target" id="ups-target-simple">/60</div>
        </div>
      </div>

      <!-- Default & Advanced Mode Header -->
      <div class="FPS__header">
        <div class="FPS__display">
          <p id="fps-current" class="FPS__current">0</p>
          <div class="FPS__separator-v"></div>
          <div class="FPS__frametime">
             <p id="frametime-value" class="FPS__frametime-value">0.0</p>
             <p class="FPS__frametime-label">FRAME TIME</p>
          </div>
        </div>
        
        <div class="FPS__stats">
            <div class="FPS__stats-row">
                <span class="FPS__stats-label">AVG</span>
                <div class="FPS__stats-bar-container"><div id="bar-avg" class="FPS__stats-bar FPS__stats-bar--avg"></div></div>
                <span id="val-avg" class="FPS__stats-value">0</span>
            </div>
            <div class="FPS__stats-row">
                <span class="FPS__stats-label">MAX</span>
                <div class="FPS__stats-bar-container"><div id="bar-max" class="FPS__stats-bar FPS__stats-bar--max"></div></div>
                <span id="val-max" class="FPS__stats-value">0</span>
            </div>
            <div class="FPS__stats-row">
                <span class="FPS__stats-label">MIN</span>
                <div class="FPS__stats-bar-container"><div id="bar-min" class="FPS__stats-bar FPS__stats-bar--min"></div></div>
                <span id="val-min" class="FPS__stats-value">0</span>
            </div>
            <div class="FPS__stats-row">
                <span class="FPS__stats-label">1%</span>
                <div class="FPS__stats-bar-container"><div id="bar-1low" class="FPS__stats-bar FPS__stats-bar--low1"></div></div>
                <span id="val-1low" class="FPS__stats-value">0</span>
            </div>
            <div class="FPS__stats-row">
                <span class="FPS__stats-label">0.1%</span>
                <div class="FPS__stats-bar-container"><div id="bar-01low" class="FPS__stats-bar FPS__stats-bar--low01"></div></div>
                <span id="val-01low" class="FPS__stats-value">0</span>
            </div>
        </div>
      </div>

      <!-- Advanced Mode Controls -->
      <div class="FPS__advanced-controls">
        <div class="FPS__control-section">
          <div class="FPS__control-header">
            <span class="FPS__control-label">FPS</span>
            <span id="fps-target-value" class="FPS__control-value">60</span>
            <button class="FPS__control-reset" data-target="fps" title="Reset to default">⟲</button>
          </div>
          <div class="FPS__slider-container">
            <input type="range" id="fps-slider" class="FPS__slider" min="0" max="120" value="60" step="1" />
            <div class="FPS__slider-fill" id="fps-slider-fill"></div>
          </div>
        </div>
        
        <div class="FPS__control-section">
          <div class="FPS__control-header">
            <span class="FPS__control-label">UPS</span>
            <span id="ups-target-value" class="FPS__control-value">60</span>
            <button class="FPS__control-reset" data-target="ups" title="Reset to default">⟲</button>
          </div>
          <div class="FPS__slider-container">
            <input type="range" id="ups-slider" class="FPS__slider" min="0" max="120" value="60" step="1" />
            <div class="FPS__slider-fill" id="ups-slider-fill"></div>
          </div>
        </div>
      </div>

    </aside>
  `;

  // Set initial mode from system data
  const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("plugin:fps-counter");
  const container = element.querySelector('.FPS__container');
  if (container) {
    container.setAttribute('data-mode', data.mode);
  }
}
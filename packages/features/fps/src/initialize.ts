import { useOverloadedSystem } from "@repo/engine";
import type { EngineSystem } from "@repo/engine";
import { schema } from "./types";

export function initialize(element: HTMLElement) {
  element.innerHTML = /* html */`
    <aside class="fixed top-2.5 right-2.5 flex flex-col gap-2 p-2.5 rounded-lg font-mono text-xs select-none pointer-events-none z-9999 bg-black/90 text-white w-[300px] data-[mode=simple]:w-auto data-[mode=simple]:flex-row data-[mode=simple]:items-center data-[mode=simple]:gap-1 data-[mode=simple]:px-2 data-[mode=simple]:py-0.5 data-[mode=simple]:h-5" data-mode="default">
      
      <!-- Simple Mode View -->
      <div class="hidden data-[mode=simple]:flex items-center gap-1" data-mode-view="simple">
        <div class="flex items-baseline gap-0.5">
          <div class="text-base font-bold leading-none" id="fps-simple">60</div>
          <div class="text-xs leading-none text-gray-400" id="fps-target-simple">/60</div>
        </div>
        <div class="text-base text-gray-500">|</div>
        <div class="flex items-baseline gap-0.5">
          <div class="text-base font-bold leading-none" id="ups-simple">60</div>
          <div class="text-xs leading-none text-gray-400" id="ups-target-simple">/60</div>
        </div>
      </div>

      <!-- Default & Advanced Mode Header -->
      <div class="flex justify-between h-25 data-[mode=simple]:hidden" data-mode-view="default">
        <div class="flex flex-col justify-center items-start w-2/5">
          <p id="fps-current" class="text-5xl font-bold leading-none m-0">0</p>
          <div class="h-0.5 bg-white w-full my-1"></div>
          <div class="flex flex-col">
             <p id="frametime-value" class="text-2xl font-bold m-0 leading-none">0.0</p>
             <p class="text-[10px] m-0 text-gray-400">FRAME TIME</p>
          </div>
        </div>
        
        <div class="flex flex-col justify-between w-[55%]">
            <div class="flex items-center h-4 gap-1">
                <span class="w-7.5 text-[10px] text-left text-gray-300">AVG</span>
                <div class="grow h-2.5 rounded-sm overflow-hidden bg-neutral-700"><div id="bar-avg" class="h-full bg-purple-500" style="width: var(--bar-width, 0%)"></div></div>
                <span id="val-avg" class="w-6.25 text-[10px] text-right font-bold">0</span>
            </div>
            <div class="flex items-center h-4 gap-1">
                <span class="w-7.5 text-[10px] text-left text-gray-300">MAX</span>
                <div class="grow h-2.5 rounded-sm overflow-hidden bg-neutral-700"><div id="bar-max" class="h-full bg-green-300" style="width: var(--bar-width, 0%)"></div></div>
                <span id="val-max" class="w-6.25 text-[10px] text-right font-bold">0</span>
            </div>
            <div class="flex items-center h-4 gap-1">
                <span class="w-7.5 text-[10px] text-left text-gray-300">MIN</span>
                <div class="grow h-2.5 rounded-sm overflow-hidden bg-neutral-700"><div id="bar-min" class="h-full bg-blue-500" style="width: var(--bar-width, 0%)"></div></div>
                <span id="val-min" class="w-6.25 text-[10px] text-right font-bold">0</span>
            </div>
            <div class="flex items-center h-4 gap-1">
                <span class="w-7.5 text-[10px] text-left text-gray-300">1%</span>
                <div class="grow h-2.5 rounded-sm overflow-hidden bg-neutral-700"><div id="bar-1low" class="h-full bg-gray-100" style="width: var(--bar-width, 0%)"></div></div>
                <span id="val-1low" class="w-6.25 text-[10px] text-right font-bold">0</span>
            </div>
            <div class="flex items-center h-4 gap-1">
                <span class="w-7.5 text-[10px] text-left text-gray-300">0.1%</span>
                <div class="grow h-2.5 rounded-sm overflow-hidden bg-neutral-700"><div id="bar-01low" class="h-full bg-gray-500" style="width: var(--bar-width, 0%)"></div></div>
                <span id="val-01low" class="w-6.25 text-[10px] text-right font-bold">0</span>
            </div>
        </div>
      </div>

      <!-- Advanced Mode Controls -->
      <div class="hidden data-[mode=advanced]:flex flex-col gap-2.5 mt-1" data-mode-view="advanced">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold w-7.5 text-gray-400">FPS</span>
            <span id="fps-target-value" class="text-sm font-bold grow">60</span>
            <button class="bg-transparent border-none text-base cursor-pointer p-0 w-5 h-5 flex items-center justify-center pointer-events-auto transition-colors duration-200 text-gray-400 hover:text-white" data-target="fps" title="Reset to default">⟲</button>
          </div>
          <div class="relative h-5 flex items-center">
            <input type="range" id="fps-slider" class="w-full h-3.5 appearance-none rounded outline-none pointer-events-auto cursor-pointer relative z-2 bg-neutral-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-sm" min="0" max="120" value="60" step="1" />
            <div class="absolute top-1/2 left-0 h-3.5 -translate-y-1/2 rounded-l pointer-events-none z-1 transition-all duration-100" id="fps-slider-fill"></div>
          </div>
        </div>
        
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold w-7.5 text-gray-400">UPS</span>
            <span id="ups-target-value" class="text-sm font-bold grow">60</span>
            <button class="bg-transparent border-none text-base cursor-pointer p-0 w-5 h-5 flex items-center justify-center pointer-events-auto transition-colors duration-200 text-gray-400 hover:text-white" data-target="ups" title="Reset to default">⟲</button>
          </div>
          <div class="relative h-5 flex items-center">
            <input type="range" id="ups-slider" class="w-full h-3.5 appearance-none rounded outline-none pointer-events-auto cursor-pointer relative z-2 bg-neutral-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-sm" min="0" max="120" value="60" step="1" />
            <div class="absolute top-1/2 left-0 h-3.5 -translate-y-1/2 rounded-l pointer-events-none z-1 transition-all duration-100" id="ups-slider-fill"></div>
          </div>
        </div>
      </div>

    </aside>
  `;

  // Set initial mode from system data
  const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("plugin:fps-counter");
  const container = element.querySelector('aside');
  if (container) {
    container.setAttribute('data-mode', data.mode);
    updateModeVisibility(container, data.mode);
  }
}

function updateModeVisibility(container: Element, mode: string) {
  // Update visibility based on mode
  const simpleView = container.querySelector('[data-mode-view="simple"]');
  const defaultView = container.querySelector('[data-mode-view="default"]');
  const advancedView = container.querySelector('[data-mode-view="advanced"]');
  
  if (simpleView) simpleView.classList.toggle('!flex', mode === 'simple');
  if (defaultView) defaultView.classList.toggle('!hidden', mode === 'simple');
  if (advancedView) advancedView.classList.toggle('!flex', mode === 'advanced');
}

export { updateModeVisibility };
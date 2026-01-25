import './index.css';

// Inject CSS if not already injected
if (!document.getElementById('fps-counter-styles')) {
  const style = document.createElement('style');
  style.id = 'fps-counter-styles';
  document.head.appendChild(style);
}

export function initialize(element: HTMLElement, toggleKey?: string) {
  element.innerHTML = /* html */`
    <aside class="FPS__container">
      <!-- Top Section -->
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

      <!-- RAM Section -->
      <div class="FPS__ram">
        <div id="ram-bar" class="FPS__ram-bg-bar"></div>
        <span class="FPS__ram-text">RAM 64GB</span>
        <span id="ram-value" class="FPS__ram-text">27.6GB</span>
      </div>

      <!-- Hardware Section -->
      <div class="FPS__hw">
         <div class="FPS__hw-row">
           <!-- Column 1: Temps -->
           <div class="FPS__hw-col FPS__hw-col--temps">
              <div>
                 <div class="FPS__hw-label FPS__hw-label--red">AMD RYZEN</div>
                 <div class="FPS__hw-value">69°C</div>
                 <div class="FPS__hw-bar FPS__hw-bar--red" style="--temp-percent: 40%"></div>
              </div>
              
              <div>
                 <div class="FPS__hw-label FPS__hw-label--green">AMD</div>
                 <div class="FPS__hw-value FPS__hw-value--white" style="font-size: 24px;">55°C</div>
              </div>
           </div>

           <!-- Column 2: Loads -->
           <div class="FPS__hw-col FPS__hw-col--loads">
              <div style="text-align: right;">
                  <span class="FPS__hw-label FPS__hw-label--white">GPU LOAD</span> <span class="FPS__hw-value FPS__hw-value--white">15%</span>
              </div>
              
              <div style="text-align: right;">
                   <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                      <span class="FPS__hw-label FPS__hw-label--white">GPU LOAD</span> <span class="FPS__hw-value FPS__hw-value--white">98%</span>
                   </div>
                   <div class="FPS__hw-bar FPS__hw-bar--green" style="--load-percent: 98%"></div>
              </div>
           </div>
         </div>
      </div>
    </aside>
  `;
}
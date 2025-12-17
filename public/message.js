// message.js - Sistema completo messaggi YouJazz (alert + confirm + prompt)
(() => {
  if (window.YouJazz?.messageReady) return;
  window.YouJazz = window.YouJazz || {};
  window.YouJazz.messageReady = true;

  // Crea overlay una sola volta
  const overlay = document.createElement('div');
  overlay.id = 'yj-message';
  overlay.className = 'yj-message-overlay';
  overlay.innerHTML = `
    <div class="yj-message-box">
      <div class="yj-message-icon" id="yj-icon">♪</div>
      <h2 class="yj-message-title" id="yj-title">YouJazz</h2>
      <p class="yj-message-text" id="yj-text"></p>
      <div id="yj-input-container" style="display:none; margin:20px 0;">
        <input type="text" id="yj-input" class="yj-input" placeholder="type here...">
      </div>
      <div style="display:flex; align-items:center; justify-content:center; gap:15px; margin:25px 0;">
        <button id="transpose-down" class="yj-message-btn yj-btn-secondary" style="width:50px; height:50px; font-size:24px;">−</button>
        <span id="transpose-value" style="font-size:32px; font-weight:bold; min-width:60px; text-align:center;">0</span>
        <button id="transpose-up" class="yj-message-btn yj-btn-secondary" style="width:50px; height:50px; font-size:24px;">+</button>
      </div>
      <div class="yj-message-buttons">
        <button class="yj-message-btn yj-btn-primary" id="yj-git">Got it!</button>
        <button class="yj-message-btn yj-btn-primary" id="yj-ok">OK</button>
        <button class="yj-message-btn yj-btn-secondary" id="yj-cancel" style="display:none;">Cancel</button>
        <button class="yj-message-btn yj-btn-danger" id="yj-confirm-yes" style="display:none;">Yes</button>
        <button class="yj-message-btn yj-btn-secondary" id="yj-confirm-no" style="display:none;">No</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  let semitones = 0;
  const iconEl = document.getElementById('yj-icon');
  const titleEl = document.getElementById('yj-title');
  const textEl = document.getElementById('yj-text');
  const inputContainer = document.getElementById('yj-input-container');
  const inputEl = document.getElementById('yj-input');
  const okBtn = document.getElementById('yj-ok');
  const gitBtn = document.getElementById('yj-git');
  const cancelBtn = document.getElementById('yj-cancel');
  const yesBtn = document.getElementById('yj-confirm-yes');
  const noBtn = document.getElementById('yj-confirm-no');
  const upBtn = document.getElementById('transpose-up');
  const downBtn = document.getElementById('transpose-down');
  const tvalueEl = document.getElementById('transpose-value');

  let resolvePromise;

  const close = () => {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };

  const show = (config) => {
    return new Promise((resolve) => {
      resolvePromise = resolve;

      semitones = 0; // Reset semitones ogni volta

      iconEl.textContent = config.icon || "♪";
      titleEl.textContent = config.title || "YouJazz";
      textEl.textContent = config.text || "";

      inputContainer.style.display = config.input ? 'block' : 'none';
      if (config.input) inputEl.value = '';

      // Visibilità pulsanti
      gitBtn.style.display = config.type === 'alert' ? 'inline-block' : 'none';
      yesBtn.style.display = config.type === 'confirm' ? 'inline-block' : 'none';
      noBtn.style.display = config.type === 'confirm' ? 'inline-block' : 'none';
      cancelBtn.style.display = ['prompt', 'transpose'].includes(config.type) ? 'inline-block' : 'none';
      okBtn.style.display = ['prompt', 'transpose'].includes(config.type) ? 'inline-block' : 'none';

      // Visibilità transpose controls
      const transposeControls = config.type === 'transpose';
      upBtn.style.display = transposeControls ? 'inline-block' : 'none';
      downBtn.style.display = transposeControls ? 'inline-block' : 'none';
      tvalueEl.style.display = transposeControls ? 'inline-block' : 'none';
      tvalueEl.textContent = '0';
      tvalueEl.style.color = '#fff';

      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        overlay.onclick = null;
        [okBtn, gitBtn, cancelBtn, yesBtn, noBtn, upBtn, downBtn].forEach(b => b.onclick = null);
        close();
      };

      const updateValue = (delta) => {
        semitones = Math.max(-11, Math.min(11, semitones + delta));
        tvalueEl.textContent = semitones > 0 ? `+${semitones}` : semitones;
        tvalueEl.style.color = semitones === 0 ? '#fff' : (semitones > 0 ? '#4CAF50' : '#e91e63');
      };

      upBtn.onclick = () => updateValue(1);
      downBtn.onclick = () => updateValue(-1);

      // OK BUTTON - Restituisce il valore corretto in base al tipo
      okBtn.onclick = () => {
        let result;
        if (config.type === 'transpose') {
          result = semitones;  // <-- restituisce il numero di semitoni
        } else if (config.type === 'prompt') {
          result = inputEl.value.trim();  // <-- restituisce il testo inserito
        } else {
          result = true;
        }
        cleanup();
        resolve(result);
      };

      gitBtn.onclick = () => { cleanup(); resolve(true); };
      cancelBtn.onclick = () => { cleanup(); resolve(false); };
      yesBtn.onclick = () => { cleanup(); resolve(true); };
      noBtn.onclick = () => { cleanup(); resolve(false); };

      overlay.onclick = (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      };
    });
  };

  // ESPORTA LE FUNZIONI
  YouJazz.showMessage = (title, text, icon = "♪") =>
    show({ type: 'alert', title, text, icon });

  YouJazz.showConfirm = (title, text, yesText = "Yes, delete", noText = "No") =>
    show({ type: 'confirm', title, text, yesText, noText, icon: "Youjazz warning" });

  YouJazz.showPrompt = (title, text, placeholder = "") =>
    show({ type: 'prompt', title, text, input: true, icon: "Edit" });

  YouJazz.showTranspose = (title, text, placeholder = "") =>
    show({ type: 'transpose', title, text, icon: "Edit" });



})();


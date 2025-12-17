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
      <div class="yj-message-buttons">
        <button class="yj-message-btn yj-btn-primary" id="yj-git">Got it!</button>
        <button class="yj-message-btn yj-btn-primary" id="yj-ok">OK</button>
        <button class="yj-message-btn yj-btn-secondary" id="yj-cancel" style="display:none;">Annulla</button>
        <button class="yj-message-btn yj-btn-danger" id="yj-confirm-yes" style="display:none;">Sì, elimina</button>
        <button class="yj-message-btn yj-btn-secondary" id="yj-confirm-no" style="display:none;">No</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

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

  let resolvePromise;

  const close = () => {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };

  const show = (config) => {
    return new Promise((resolve) => {
      resolvePromise = resolve;

      iconEl.textContent = config.icon || "♪";
      titleEl.textContent = config.title || "YouJazz";
      textEl.textContent = config.text || "";
      inputContainer.style.display = config.input ? 'block' : 'none';
      if (config.input) inputEl.value = '';

      // Pulsanti
      gitBtn.style.display = config.type === 'alert' ? 'inline-block' : 'none';
      okBtn.style.display = config.type === 'prompt' ? 'inline-block' : 'none';
      cancelBtn.style.display = config.type === 'prompt' ? 'inline-block' : 'none';
      yesBtn.style.display = config.type === 'confirm' ? 'inline-block' : 'none';
      noBtn.style.display = config.type === 'confirm' ? 'inline-block' : 'none';

      okBtn.textContent = config.okText || "OK";
      gitBtn.textContent = config.okText || "OK";
      cancelBtn.textContent = config.cancelText || "Cancel";
      yesBtn.textContent = config.yesText || "Yes, delete";
      noBtn.textContent = config.noText || "No";

      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';

      // Eventi
      const cleanup = () => {
        overlay.onclick = null;
        [okBtn, cancelBtn, yesBtn, noBtn].forEach(b => b.onclick = null);
        close();
      };

      okBtn.onclick = () => { cleanup(); resolve(inputEl.value || true); };
      gitBtn.onclick = () => { cleanup(); resolve(inputEl.value || true); };

      cancelBtn.onclick = () => { cleanup(); resolve(false); };
      yesBtn.onclick = () => { cleanup(); resolve(true); };
      noBtn.onclick = () => { cleanup(); resolve(false); };

      overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
    });
  };

  // ESPORTA LE FUNZIONI
  YouJazz.showMessage = (title, text, icon = "♪") =>
    show({ type: 'alert', title, text, icon });

  YouJazz.showConfirm = (title, text, yesText = "Yes, delete", noText = "No") =>
    show({ type: 'confirm', title, text, yesText, noText, icon: "Youjazz warning" });

  YouJazz.showPrompt = (title, text, placeholder = "") =>
    show({ type: 'prompt', title, text, input: true, icon: "Edit" });



  YouJazz.showTranspose = () => {
    return new Promise((resolve) => {
      const overlay = document.getElementById('yj-message');
      const box = overlay.querySelector('.yj-message-box');

      // Sostituisci contenuto
      box.innerHTML = `
      <div class="yj-message-icon">🎵</div>
      <h2 class="yj-message-title">Transpose Song</h2>
      <p class="yj-message-text">Select semitones to transpose:</p>
      
      <div style="display:flex; align-items:center; justify-content:center; gap:15px; margin:25px 0;">
        <button id="transpose-down" class="yj-message-btn yj-btn-secondary" style="width:50px; height:50px; font-size:24px;">−</button>
        <span id="transpose-value" style="font-size:32px; font-weight:bold; min-width:60px; text-align:center;">0</span>
        <button id="transpose-up" class="yj-message-btn yj-btn-secondary" style="width:50px; height:50px; font-size:24px;">+</button>
      </div>
      
      <div class="yj-message-buttons">
        <button class="yj-message-btn yj-btn-primary" id="transpose-apply">Apply</button>
        <button class="yj-message-btn yj-btn-secondary" id="transpose-cancel">Cancel</button>
      </div>
    `;

      let semitones = 0;
      const valueEl = document.getElementById('transpose-value');
      const upBtn = document.getElementById('transpose-up');
      const downBtn = document.getElementById('transpose-down');
      const applyBtn = document.getElementById('transpose-apply');
      const cancelBtn = document.getElementById('transpose-cancel');

      const updateValue = (delta) => {
        semitones = Math.max(-11, Math.min(11, semitones + delta));
        valueEl.textContent = semitones > 0 ? `+${semitones}` : semitones;
        valueEl.style.color = semitones === 0 ? '#fff' : (semitones > 0 ? '#4CAF50' : '#e91e63');
      };

      upBtn.onclick = () => updateValue(1);
      downBtn.onclick = () => updateValue(-1);

      const cleanup = () => {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
      };

      applyBtn.onclick = () => { cleanup(); resolve(semitones); };
      cancelBtn.onclick = () => { cleanup(); resolve(null); };
      overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(null); } };

      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
  };

})();


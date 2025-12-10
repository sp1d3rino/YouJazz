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
        <input type="text" id="yj-input" class="yj-input" placeholder="Scrivi qui...">
      </div>
      <div class="yj-message-buttons">
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
      okBtn.style.display = config.type === 'alert' ? 'inline-block' : 'none';
      cancelBtn.style.display = config.type === 'prompt' ? 'inline-block' : 'none';
      yesBtn.style.display = config.type === 'confirm' ? 'inline-block' : 'none';
      noBtn.style.display = config.type === 'confirm' ? 'inline-block' : 'none';

      okBtn.textContent = config.okText || "OK";
      cancelBtn.textContent = config.cancelText || "Annulla";
      yesBtn.textContent = config.yesText || "Sì, elimina";
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
      cancelBtn.onclick = () => { cleanup(); resolve(false); };
      yesBtn.onclick = () => { cleanup(); resolve(true); };
      noBtn.onclick = () => { cleanup(); resolve(false); };

      overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
    });
  };

  // ESPORTA LE FUNZIONI
  YouJazz.showMessage = (title, text, icon = "♪") =>
    show({ type: 'alert', title, text, icon });

  YouJazz.showConfirm = (title, text, yesText = "Sì, elimina", noText = "No") =>
    show({ type: 'confirm', title, text, yesText, noText, icon: "Youjazz warning" });

  YouJazz.showPrompt = (title, text, placeholder = "") =>
    show({ type: 'prompt', title, text, input: true, icon: "Edit" });
})();
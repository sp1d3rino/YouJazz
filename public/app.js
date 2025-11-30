

const CHORDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'P'];
const CHORD_EXTENSIONS = ['#', '♭', 'ø', 'o', '6', '7', '9', 'm', 'maj7'];
const SONG_STYLES = ['swing', 'bossa'];

class GypsyApp {
  constructor() {
    this.player = new GypsyPlayer();
    this.currentSong = null;
    this.isPlaying = false;
    this.currentChordIndex = 0;


    // AVVIO IMMEDIATO – NON SERVE PIÙ init() dopo New Song
    this.loadChordsPalette();
    this.render();                    // mostra griglia vuota o messaggio
    this.loadSongsList();             // carica subito la dropdown
    this.setupGlobalEvents();
    this.setupEvents();               // eventi sempre attivi (BPM, Play, Stop, ecc.)
    this.setupCopyPaste();

    this.currentStyle = 'swing'; // default iniziale
    if (window.innerWidth <= 768) {
      const palette = document.querySelector('.chord-palette');
      let lastScrollY = window.scrollY;

      const handleScroll = () => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY;

        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Scroll down → nascondi palette
          palette.classList.remove('mobile-visible');
        } else {
          // Scroll up o in cima → mostra palette
          palette.classList.add('mobile-visible');
        }

        lastScrollY = currentScrollY;
      };

      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
          palette.classList.remove('mobile-visible');
          window.removeEventListener('scroll', handleScroll);
        }
      });
    }

    // Visual feedback drag & drop
    document.addEventListener('dragover', e => {
      const target = e.target.closest('.measure, .chord-box');
      if (target) {
        target.classList.add('drag-over');
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });

    document.addEventListener('dragleave', e => {
      const target = e.target.closest('.measure, .chord-box');
      if (target) target.classList.remove('drag-over');
    });

    document.addEventListener('drop', e => {
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    // Icona manina con Ctrl (per copy)
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) {
        document.body.classList.add('ctrl-drag');
      }
    });

    document.addEventListener('keyup', e => {
      if (e.key === 'Control' || e.key === 'Meta') {
        document.body.classList.remove('ctrl-drag');
      }
    });

  }

  async updateCreatedByForCurrentUser() {
    try {
      const res = await fetch('/auth/me', { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        // Simula un oggetto song con owner = utente corrente
        this.showCreatedBy({ owner: { displayName: user.displayName || 'You' } });
      } else {
        this.showCreatedBy({ owner: null }); // guest o errore
      }
    } catch (e) {
      this.showCreatedBy({ owner: null });
    }
  }

  showCreatedBy(song) {
    const titleBox = document.getElementById('song-title');
    let createdByEl = titleBox.nextElementSibling;

    if (!createdByEl || !createdByEl.classList.contains('created-by')) {
      createdByEl = document.createElement('div');
      createdByEl.className = 'created-by';
      createdByEl.style.cssText = 'font-size: 0.9em; color: #888; margin-top: 5px; text-align: center; font-style: italic;';
      titleBox.parentNode.insertBefore(createdByEl, titleBox.nextSibling);
    }

    const ownerName = this.getOwnerName(song);
    createdByEl.textContent = `Created by: ${ownerName}`;
  }

  isGuest() {
    return document.body.classList.contains('guest-mode');
  }

  updateUIControls() {
    const isPlaying = this.isPlaying;

    // Play / Stop / Clear Grid buttons
    document.getElementById('play').disabled = isPlaying;
    document.getElementById('stop').disabled = !isPlaying;
    document.getElementById('clear-all').disabled = isPlaying;

    // BPM slider
    document.getElementById('bpm-slider').disabled = isPlaying;
  }
  getOwnerName(song) {
    return song.owner ? song.owner.displayName || 'Unknown' : 'Public';
  }
  showNewGridModal() {
    if (this.isGuest()) {
      YouJazz.showMessage("Permission denied", "Guest mode: You cannot create new songs. Login to create lead sheets.");
      return;
    }
    const modal = document.getElementById('grid-setup-modal');
    modal.classList.remove('hidden');

    const createBtn = document.getElementById('create-grid');
    const handler = () => {
      const rows = parseInt(document.getElementById('grid-rows').value) || 4;
      const cols = parseInt(document.getElementById('grid-cols').value) || 4;
      // Crea il nuovo brano
      this.currentSong = {
        title: 'Song name',
        style: this.currentStyle,
        bpm: 120,
        grid: { rows, cols },
        measures: Array(rows * cols).fill(null).map(() => ({ chords: [] }))
      };

      // Resetta il titolo nel campo input
      document.getElementById('song-title').value = 'Song name';

      // Aggiorna "Created by:" con l'utente corrente (senza await!)
      fetch('/auth/me', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(user => {
          const displayName = user ? user.displayName || 'You' : 'You';
          this.showCreatedBy({ owner: { displayName } });
        })
        .catch(() => {
          this.showCreatedBy({ owner: { displayName: 'You' } });
        });

      // Renderizza
      this.render();

      modal.classList.add('hidden');
      createBtn.removeEventListener('click', handler);


    };

    createBtn.onclick = handler;
  }

  setupGlobalEvents() {
    document.getElementById('new-song').onclick = async () => {
      if (this.currentSong) {
        const confirmed = await YouJazz.showConfirm(
          "New Song",
          "Do you want to create a new song? Unsaved changes will be lost.",
          "Create New",
          "Cancel"
        );
        if (!confirmed) return;
      }

      this.showNewGridModal();
    };
  }

  setupEvents() {
    // Sempre attivi, anche senza canzone caricata
    document.getElementById('bpm-slider').oninput = e => {
      document.getElementById('bpm-value').textContent = e.target.value;
      if (this.currentSong) this.currentSong.bpm = +e.target.value;
    };

    document.getElementById('clear-all').onclick = () => {
      if (this.isGuest()) {
        YouJazz.showMessage("Permission denied", "Guest mode: You cannot clear songs.");
        return;
      }
    };

    document.getElementById('clear-all').onclick = async () => {
      if (!this.currentSong) return;

      const confirmed = await YouJazz.showConfirm(
        "Clear All",
        "Are you sure you want to clear all chords? This action cannot be undone.",
        "Clear All",
        "Cancel"
      );

      if (!confirmed) return;

      this.currentSong.measures.forEach(m => m.chords = []);
      this.render();
    };

    document.getElementById('play').onclick = () => this.play();
    document.getElementById('stop').onclick = () => this.stopPlayback();
    document.getElementById('save-song').onclick = () => {
      if (this.isGuest()) {

        YouJazz.showMessage("Permission denied", "Guest mode: You cannot save songs. Login to save.");
        return;
      }
      this.saveSong();
    };

    document.getElementById('delete-song').onclick = () => {
      if (this.isGuest()) {

        YouJazz.showMessage("Permission denied", "Guest mode: You cannot delete songs.");
        return;
      }
      this.deleteCurrentSong();
    };
  }




  loadChordsPalette() {
    const chordList = document.querySelector('.chord-list');
    const extList = document.querySelector('.extension-list');
    const styleList = document.querySelector('.style-selector');

    chordList.innerHTML = '';
    extList.innerHTML = '';
    styleList.innerHTML = '';

    // Style buttons
    SONG_STYLES.forEach(style => {
      const btn = document.createElement('button');
      btn.className = 'style-btn';
      btn.textContent = style.charAt(0).toUpperCase() + style.slice(1);
      btn.dataset.style = style;
      btn.addEventListener('click', () => {
        // Imposta stile globale
        this.currentStyle = style;

        // Aggiorna UI
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Applica stile a tutti gli accordi esistenti
        document.querySelectorAll('.chord-box').forEach(box => {
          box.dataset.style = style;
        });

        // Ricarica i sample audio per tutti gli accordi
        this.reloadAllSamples();
      });

      if (style === this.currentStyle) btn.classList.add('active');
      styleList.appendChild(btn);
    });


    // Accordi base
    CHORDS.forEach(ch => {
      const btn = document.createElement('div');
      btn.className = 'chord-btn';
      btn.textContent = ch;
      btn.draggable = true;
      btn.addEventListener('dragstart', e => {
        // CORREZIONE: Usa SEMPRE this.currentStyle (garantito 'swing' al primo load)
        // Ignora i tab se non attivi (fix per primo caricamento)
        const style = this.currentStyle;  // ← CAMBIO QUI: diretto dal default app

        e.dataTransfer.setData('text/plain', ch);
        e.dataTransfer.setData('type', 'chord');
        e.dataTransfer.setData('style', style);  // ← Ora passa sempre 'swing' corretto


      });
      chordList.appendChild(btn);
    });

    // Estensioni
    CHORD_EXTENSIONS.forEach(ext => {
      const btn = document.createElement('div');
      btn.className = 'extension-btn';
      btn.textContent = ext;
      btn.draggable = true;
      btn.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', ext);
        e.dataTransfer.setData('type', 'extension');
      });
      extList.appendChild(btn);
    });

    // === NUOVO: Gestione click sui tab La Pompe / Bossa ===
    // GESTIONE CLICK TAB – CAMBIO STILE GLOBALE
    document.querySelectorAll('.style-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (!this.currentSong) {

          YouJazz.showMessage("No song loaded", "Create or load a song before changing style.");
          return;
        }

        // 1. Rimuovi active da tutti
        document.querySelectorAll('.style-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 2. Aggiorna stile corrente
        const newStyle = tab.dataset.style;
        this.currentStyle = newStyle;
        this.currentSong.style = newStyle;
        localStorage.setItem('lastStyle', newStyle);

        // 3. CAMBIO STILE A TUTTI GLI ACCORDI ESISTENTI NELLA GRIGLIA
        document.querySelectorAll('.chord-box').forEach(box => {
          box.dataset.style = newStyle;
        });

        this.player.buffers.clear(); // uncomment se vuoi forzare ricaricamento audio


      });
    });
    // Imposta tab iniziale attivo (La Pompe di default)
    const defaultTab = document.querySelector('[data-style="swing"]');
    if (defaultTab) defaultTab.classList.add('active');
  }

  setupCopyPaste() {
    let isCtrlPressed = false;
    let sourceChord = null;
    let sourceBox = null;

    document.addEventListener('keydown', e => {
      if (e.key === 'Control') isCtrlPressed = true;
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'Control') isCtrlPressed = false;
    });

    document.addEventListener('mousedown', e => {
      if (!this.currentSong || !isCtrlPressed) return;

      const box = e.target.closest('.chord-box');
      if (!box) return;

      // THE FIX: Get only the chord name, NOT the × button!
      sourceChord = box.firstChild.textContent.trim(); // This is the chord text node
      // OR even safer:
      // sourceChord = box.childNodes[0].textContent.trim();

      sourceBox = box;
      e.preventDefault();

      sourceBox.style.opacity = '0.6';
      sourceBox.style.transform = 'scale(1.12)';
      sourceBox.style.transition = 'all 0.12s';
    });

    document.addEventListener('mouseup', e => {
      if (!sourceChord || !sourceBox) return;

      const targetMeasure = e.target.closest('.measure');
      if (!targetMeasure) {
        sourceBox.style.opacity = '';
        sourceBox.style.transform = '';
        sourceChord = null;
        sourceBox = null;
        return;
      }

      const measureIndex = Array.from(document.querySelectorAll('.measure')).indexOf(targetMeasure);
      const targetBox = e.target.closest('.chord-box');
      const measure = this.currentSong.measures[measureIndex];

      if (targetBox) {
        const chordIndex = Array.from(targetMeasure.querySelectorAll('.chord-box')).indexOf(targetBox);
        measure.chords[chordIndex] = sourceChord;
      } else {
        measure.chords.push(sourceChord);
      }

      this.preloadIfNeeded(sourceChord);
      this.render();

      // Reset
      sourceBox.style.opacity = '';
      sourceBox.style.transform = '';
      sourceChord = null;
      sourceBox = null;
    });
  }



  showCopyFeedback() {
    // Optional: show a little toast
    const toast = document.createElement('div');
    toast.textContent = `Copied: ${this.clipboard}`;
    toast.style.cssText = `
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
      background: #27ae60; color: white; padding: 12px 24px; border-radius: 8px;
      font-weight: bold; z-index: 10000; font-size: 1.1em; pointer-events: none;
      animation: fadeup, 0.4s forwards, fadeOut 0.6s 2s forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }



  render() {
    const sheet = document.getElementById('lead-sheet');
    this.updateUIControls();
    if (!this.currentSong) {
      sheet.innerHTML = `
      <p style="
        color: #999;
        font-size: 1.3em;
        text-align: center;
        margin: 0 20px;
        font-style: italic;
        pointer-events: none;
      ">
        Create a new song or load one from the list<br>
        <span style="font-size:0.9em;color:#666;">(Click the image to fade it)</span>
      </p>
      <div style="
      position: relative;
      width: 100%;
      height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 20px;
      pointer-events: none;
    ">
      <img src="images/hints.png" alt="How to use YouJazz" style="
        max-width: 90%;
        max-height: 70vh;
        opacity: 0.28;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        pointer-events: auto;
        cursor: pointer;
      " onclick="this.style.opacity = this.style.opacity === '0.3' ? '0.88' : '0.3'">
      
    </div>
  `;
      return;
    }

    sheet.innerHTML = '';
    sheet.style.gridTemplateColumns = `repeat(${this.currentSong.grid.cols}, 1fr)`;

    this.currentSong.measures.forEach(m => {
      const measure = document.createElement('div');
      measure.className = 'measure' + (m.chords.length === 0 ? ' empty' : '');

      measure.ondrop = e => {
        e.preventDefault();
        const droppedText = e.dataTransfer.getData('text/plain');
        const type = e.dataTransfer.getData('type');
        const style = e.dataTransfer.getData('style') || 'swing'; // ← recupera stile

        if (type === 'chord' && droppedText) {
          m.chords.push(droppedText);

          // Forza render per aggiornare DOM
          this.render();

          // Dopo render, aggiungi data-style al box appena creato
          setTimeout(() => {
            const boxes = measure.querySelectorAll('.chord-box');
            const lastBox = boxes[boxes.length - 1];
            if (lastBox) {
              lastBox.dataset.style = style;
            }
          }, 0);

          this.preloadIfNeeded(droppedText);
        }
      };
      measure.ondragover = e => e.preventDefault();

      const chordsInMeasure = m.chords.length;

      // Ripristiniamo sempre lo stato originale della misura
      measure.style.display = '';
      measure.style.gridTemplateColumns = '';
      measure.style.gridTemplateRows = '';
      measure.style.gap = '';
      measure.style.padding = '';
      measure.innerHTML = ''; // importante: svuotiamo per ricostruire

      if (chordsInMeasure === 0) {
        measure.classList.add('empty');
      } else {
        measure.classList.remove('empty');

        if (chordsInMeasure <= 2) {
          // 1 o 2 accordi → disposizione orizzontale classica
          measure.style.display = 'flex';
          measure.style.justifyContent = 'space-around';
          measure.style.alignItems = 'center';


          m.chords.forEach((chord, i) => {
            const box = this.createChordBox(chord, i, m); // funzione separata sotto
            box.style.fontSize = '1.4em';
            measure.appendChild(box);
          });

        } else {
          // 3 o 4 accordi → SUB-GRID 2×2 solo per questa misura
          measure.style.display = 'grid';
          measure.style.gridTemplateColumns = '1fr 1fr';
          measure.style.gridTemplateRows = '1fr 1fr';
          measure.style.gap = '4px';
          measure.style.padding = '4px';
          measure.style.background = 'rgba(40,40,40,0.9)';
          measure.style.borderRadius = '6px';

          // Crea 4 posizioni (anche se usiamo solo 3)
          // ORDINE ORARIO: 0=(0,0), 1=(0,1), 2=(1,1), 3=(1,0)
          const clockwiseOrder = [0, 1, 3, 2]; // ← questa è la magia!

          const displayOrder = [
            { gridRow: 1, gridColumn: 1, logicalIndex: 0 }, // 1° accordo → alto-sinistra
            { gridRow: 1, gridColumn: 2, logicalIndex: 1 }, // 2° → alto-destra
            { gridRow: 2, gridColumn: 2, logicalIndex: 2 }, // 3° → basso-destra
            { gridRow: 2, gridColumn: 1, logicalIndex: 3 }  // 4° → basso-sinistra
          ];

          displayOrder.forEach((posInfo, visualIndex) => {
            const cell = document.createElement('div');
            cell.style.display = 'flex';
            cell.style.alignItems = 'center';
            cell.style.justifyContent = 'center';
            cell.style.background = 'rgba(30,30,30,0.8)';
            cell.style.borderRadius = '4px';
            cell.style.minHeight = '36px';
            cell.style.gridRow = posInfo.gridRow;
            cell.style.gridColumn = posInfo.gridColumn;

            // Se abbiamo abbastanza accordi, inseriamo quello corrispondente
            if (visualIndex < chordsInMeasure) {
              const logicalIndex = posInfo.logicalIndex;
              const chord = m.chords[logicalIndex];

              const box = this.createChordBox(chord, logicalIndex, m); // logicalIndex = indice reale nell'array
              box.style.fontSize = '1.05em';
              box.style.lineHeight = '1.1';
              box.classList.add('sub-chord-box');

              cell.appendChild(box);
            }

            measure.appendChild(cell);
          });
        }
      }

      sheet.appendChild(measure);
    });




    // NEW: Disable editing for guests
    if (this.isGuest()) {
      document.querySelectorAll('.measure').forEach(m => {
        m.ondragover = null;
        m.ondrop = null;
      });
      document.querySelectorAll('.chord-box').forEach(b => {
        b.draggable = false;
        b.onclick = null;
      });
      document.querySelectorAll('.remove').forEach(r => r.style.display = 'none');
      document.getElementById('new-song').style.display = 'none';
      document.getElementById('save-song').style.display = 'none';
      document.getElementById('delete-song').style.display = 'none';
      document.getElementById('clear-all').style.display = 'none';
      // Add notice
      const notice = document.createElement('div');
      notice.id = 'guest-notice';
      notice.style.cssText = 'position:fixed;top:10px;right:10px;background:#ff6b6b;color:white;padding:10px;border-radius:8px;font-size:0.9em;z-index:1000;';
      notice.textContent = 'Guest mode (read-only) — Login to edit';
      document.body.appendChild(notice);
    } else {
      // Re-enable for logged-in
      document.querySelectorAll('.measure').forEach(m => {
        // Re-attach drop handlers if needed (your existing logic)
      });
      document.querySelectorAll('.chord-box').forEach(b => b.draggable = true);
      document.querySelectorAll('.remove').forEach(r => r.style.display = '');
      document.getElementById('new-song').style.display = '';
      document.getElementById('save-song').style.display = '';
      document.getElementById('delete-song').style.display = '';
      document.getElementById('clear-all').style.display = '';
      const notice = document.getElementById('guest-notice');
      if (notice) notice.remove();
    }




  }

  createChordBox(chord, index, measure) {
    const box = document.createElement('div');
    box.className = 'chord-box';
    box.textContent = chord;
    box.draggable = true;
    box.dataset.style = this.currentStyle;
    // AUTO-FIT FONT (solo per 1-2 accordi)
    if (measure.chords.length <= 2) {
      const test = document.createElement('span');
      test.textContent = chord;

      test.style.visibility = 'hidden';
      test.style.position = 'absolute';
      test.style.whiteSpace = 'nowrap';
      test.style.fontWeight = 'bold';
      test.style.fontSize = '1.4em';
      document.body.appendChild(test);
      const w = test.getBoundingClientRect().width;
      document.body.removeChild(test);

      if (w > 135) {
        const size = Math.max(0.8, (135 / w) * 1.4);
        box.style.fontSize = size.toFixed(2) + 'em';
      }
    }

    // Drag start
    box.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', chord);
      e.dataTransfer.setData('type', 'chord');
      setTimeout(() => {
        measure.chords.splice(index, 1);
        this.render();
      }, 0);
    });

    // Drop estensioni — LA TUA LOGICA ESATTA, INTATTA
    box.ondragover = e => e.preventDefault();

    box.ondrop = e => {
      e.preventDefault();
      e.stopPropagation();

      const droppedText = e.dataTransfer.getData('text/plain');
      const type = e.dataTransfer.getData('type');
      if (type !== 'extension') return;

      let newChord = chord;

      if (['#', '♭', 'ø', 'o'].includes(droppedText)) {
        const rootMatch = chord.match(/^([A-G][#♭]?)/i);
        const root = rootMatch ? rootMatch[0] : chord[0];

        if (droppedText === '#' || droppedText === '♭') {
          newChord = root[0] + droppedText;
        } else {
          newChord = root + droppedText;
          if (droppedText === 'ø');
          if (droppedText === 'o');
        }

        const rest = chord.slice(root.length);
        if (rest && !['#', '♭', 'ø', 'o'].includes(rest[0])) {
          newChord += rest.replace(/^(maj|m)?[0-9]*/g, '');
        }
      }
      else if (droppedText === 'm') {
        newChord = chord.replace(/(maj|m)?[0-9]*$/g, '') + 'm';
      }
      else if (droppedText === 'maj7') {
        newChord = chord.replace(/(maj|m)?[0-9]*$/g, '') + 'maj7';
      }
      else if (['6', '7', '9'].includes(droppedText)) {
        newChord = chord.replace(/[0-9]+$/, '') + droppedText;
      }

      measure.chords[index] = newChord;
      this.preloadIfNeeded(newChord);
      this.render();


    };

    // Tasto ×
    const x = document.createElement('span');
    x.className = 'remove';
    x.textContent = '×';
    x.onclick = e => {
      e.stopPropagation();
      measure.chords.splice(index, 1);
      this.render();
    };
    box.appendChild(x);

    return box;
  }

  async play() {
    if (this.isPlaying || !this.currentSong) return;
 
    if (this.currentSong?._id) {
      Database.incrementPlayCount(this.currentSong._id);
    }

    this.isPlaying = true;
    this.currentChordIndex = 0;
    this.updateUIControls();

    // Pulizia highlight residuo
    document.querySelectorAll('.chord-box, .sub-chord-box').forEach(el => el.classList.remove('playing'));

    // Costruisci sequenza
    const seq = [];
    const beatCounts = [];

    for (const m of this.currentSong.measures) {
      if (m.chords.length === 0) continue;
      const beatsPerChord = 4 / m.chords.length;
      m.chords.forEach(ch => {
        seq.push(ch);
        beatCounts.push(beatsPerChord);
      });
    }

    if (seq.length === 0) {
      YouJazz.showMessage("Playback Error", "No chords to play!");
      this.isPlaying = false;
      this.updateUIControls();
      return;
    }

    // Preload TUTTI i buffer (già qui → zero delay)
    document.getElementById('audio-spinner').classList.remove('hidden');
    await Promise.all(seq.map(ch => {
      const box = document.querySelector(`.chord-box[textContent="${ch}"]`);
      const style = box?.dataset.style || this.currentStyle;
      return this.player.load(ch, style).catch(() => { });
    }));
    document.getElementById('audio-spinner').classList.add('hidden');

    // CALLBACK HIGHLIGHT (invariato)
    const onChordPlay = (index, chordName) => {
      document.querySelectorAll('.chord-box, .sub-chord-box').forEach(el => el.classList.remove('playing'));
      document.querySelectorAll('.chord-box, .sub-chord-box').forEach(box => {
        if (box.textContent.trim() === chordName.trim()) {
          box.classList.add('playing');
        }
      });
    };

    const onEnd = () => {
      document.querySelectorAll('.chord-box, .sub-chord-box').forEach(el => el.classList.remove('playing'));
    };

    // Avvia con count-in integrato (passa opzionale enableCountIn: true)
    this.player.playVariableSequence(
      seq,
      beatCounts.map(b => b * (60 / this.currentSong.bpm)),
      this.currentSong.bpm,
      onChordPlay,
      onEnd,
      true  // enableCountIn
    );
  }

  reloadAllSamples() {
    // Svuota la cache del player
    this.player.buffers.clear();

    // Ricarica tutti gli accordi visibili con il nuovo stile
    document.querySelectorAll('.chord-box').forEach(box => {

      const chord = box.childNodes[0].textContent.trim();
      const style = box.dataset.style || this.currentStyle;
      this.player.load(chord, style).catch(() => { });
    });
  }

  stopPlayback() {
    this.player.stop();
    this.isPlaying = false;
    this.updateUIControls();
    this.currentChordIndex = 0;
  }

  async preloadIfNeeded(chord) {
    const style = (document.querySelector(`.chord-box[textContent="${chord}"]`)?.dataset.style) || this.currentStyle || 'swing';
    if (this.player.buffers.has(chord + '|' + style)) return;



    try {
      await this.player.load(chord, style); // passa stile
      if (this.player.buffers.has(chord)) return;
    } catch (err) {
      if (err.message === 'REMOVE_CHORD') {
        // Rimuove TUTTI gli accordi con quel nome dalla griglia
        let removed = false;
        this.currentSong.measures.forEach(measure => {
          for (let i = measure.chords.length - 1; i >= 0; i--) {
            if (measure.chords[i] === err.chordToRemove) {
              measure.chords.splice(i, 1);
              removed = true;
            }
          }
        });
        if (removed) {
          this.render();
          // Toast opzionale (puoi rimuoverlo se non vuoi)
          this.showToast?.(`Invalid chord ${err.chordToRemove}`, 'warning');
        }
      } else {
        console.error('Errore audio:', err);
      }
    }
  }

  async saveSong() {
    if (!this.currentSong) {
      return YouJazz.showMessage("Save Error", "No song to save.");
    }



    const title = document.getElementById('song-title').value.trim() || 'Untitled';
    this.currentSong.title = title;
    this.currentSong.style = this.currentStyle;
    try {
      // Chiediamo al backend chi è l'utente corrente
      const userRes = await fetch('/auth/me', { credentials: 'include' });
      if (!userRes.ok) throw new Error('Unauthenticated');

      const currentUser = await userRes.json();

      // Se il brano ha già un _id → stiamo modificando un brano esistente
      if (this.currentSong._id) {
        // Verifichiamo che il proprietario sia lo stesso dell'utente loggato
        const songRes = await fetch(`/api/songs/${this.currentSong._id}`, { credentials: 'include' });
        if (!songRes.ok) throw new Error('Unable to verify song owner');

        const songFromServer = await songRes.json();
        // BLOCCO DI SICUREZZA: se il proprietario non è l'utente corrente → BLOCCA
        if (songFromServer.owner._id.toString() !== currentUser.id) {
          YouJazz.showMessage("YouJazz", "This song is not yours. You cannot modify it!");
          await this.loadSongsList();  // ricarica la lista per sicurezza
          return;
        }
      }

      // Se arriviamo qui → l'utente può salvare (nuovo brano o suo)
      const saved = await Database.saveSong(this.currentSong);

      // Aggiorniamo l'_id solo se è un nuovo brano
      if (!this.currentSong._id) {
        this.currentSong._id = saved._id;
      }

      YouJazz.showMessage("YouJazz", `Song ${title} saved successfully!`);
      await this.loadSongsList();

    } catch (e) {
      console.error('Saving error:', e);

      YouJazz.showMessage("Save Error", "Unable to save the song. Are you logged in?");
    }
  }

  async deleteCurrentSong() {
    if (!this.currentSong?._id) return YouJazz.showMessage("Delete Error", "No song loaded.");
    if (!(await YouJazz.showConfirm(
      "Delete Song",
      `Do you want eliminate "${this.currentSong.title}"?`,
      "Yes, delete it",
      "Cancel"
    ))) return;

    try {
      // Chiediamo al backend chi è l'utente corrente
      const userRes = await fetch('/auth/me', { credentials: 'include' });
      if (!userRes.ok) throw new Error('Unauthenticated');

      const currentUser = await userRes.json();

      // Se il brano ha già un _id → stiamo modificando un brano esistente
      if (this.currentSong._id) {
        // Verifichiamo che il proprietario sia lo stesso dell'utente loggato
        const songRes = await fetch(`/api/songs/${this.currentSong._id}`, { credentials: 'include' });
        if (!songRes.ok) throw new Error('Unable to verify song owner');

        const songFromServer = await songRes.json();

        // BLOCCO DI SICUREZZA: se il proprietario non è l'utente corrente → BLOCCA
        if (songFromServer.owner._id.toString() !== currentUser.id) {
          YouJazz.showMessage("Unable to delete", 'This song is not yours. You cannot delete it!');
          await this.loadSongsList();  // ricarica la lista per sicurezza
          return;
        }
      }


      await Database.deleteSong(this.currentSong._id);
      this.currentSong = null;
      this.render();
      YouJazz.showMessage("Song deleted", 'Song successfully deleted');
      await this.loadSongsList();
    } catch (e) {
      console.error('Saving error:', e);
      YouJazz.showMessage("Save Error", "Unable to save the song. Are you logged in?");
    }
  }

  updateLikeButton(song, currentUser) {
    let btn = document.getElementById('like-btn-current');

    // Crea il pulsante solo la prima volta
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'like-btn-current';
      btn.className = 'like-btn';
      btn.innerHTML = ' 👍  <span id="like-count">0</span>';
      document.querySelector('#clear-all').after(btn);
    }

    if (!song?._id) {
      btn.style.display = 'none';
      return;
    }

    btn.style.display = 'inline-block';
    const likes = song.likes?.length || 0;
    btn.querySelector('#like-count').textContent = likes;

    const hasLiked = currentUser && song.likes?.includes(currentUser.id);
    btn.classList.toggle('liked', hasLiked);
    btn.disabled = !currentUser;
    btn.onclick = null; // ← previene duplicati di click
    btn.onclick = async () => {
      if (!currentUser) {
        YouJazz.showMessage("Login richiesto", "Devi essere loggato per mettere like");
        return;
      }

      try {
        const res = await fetch(`/api/songs/${song._id}/like`, {
          method: 'POST',
          credentials: 'include'
        });
        if (!res.ok) throw new Error();

        const data = await res.json();
        btn.querySelector('#like-count').textContent = data.likes;
        btn.classList.toggle('liked', data.hasLiked);

        // Aggiorna dropdown
        this.loadSongsList();
      } catch (err) {
        YouJazz.showMessage("Errore", "Impossibile aggiornare il like");
      }
    };
  }

  async loadSongsList() {
    try {
      const songs = await Database.getSongs();
      const sel = document.getElementById('song-list');

      // PULIZIA TOTALE – QUESTO È IL FIX DEFINITIVO
      sel.innerHTML = '<option value="">– Load Song –</option>';

      // Utente loggato (una sola volta)
      let currentUser = null;
      try {
        const res = await fetch('/auth/me', { credentials: 'include' });
        if (res.ok) currentUser = await res.json();
      } catch (e) { }

      // Popola la lista – UNA SOLA VOLTA per brano
      songs.forEach(song => {
        const opt = document.createElement('option');
        opt.value = song._id;

        const likes = song.likes?.length || 0;
        const likeText = likes > 0 ? `👍 ${likes}` : '';

        opt.textContent = `${song.title} (${this.getOwnerName(song)})${likeText}`;
        sel.appendChild(opt);
      });

      // onchange – NON RICHIAMA loadSongsList() qui dentro!
      sel.onchange = async () => {
        const id = sel.value;
        if (!id) return;

        try {
          const res = await fetch(`/api/songs/${id}`, { credentials: 'include' });
          const db = await res.json();

          // Ricostruisci currentSong (identico al tuo originale)
          this.currentSong = {
            _id: db._id,
            title: db.title,
            style: db.style || 'swing',
            bpm: db.bpm || 200,
            grid: db.grid || { rows: 4, cols: 4 },
            measures: []
          };
          this.currentStyle = db.style || 'swing';

          document.querySelectorAll('.chord-box').forEach(box => box.dataset.style = this.currentStyle);
          this.reloadAllSamples();
          document.querySelectorAll('.style-btn').forEach(b => b.classList.toggle('active', b.dataset.style === this.currentStyle));

          let cur = { chords: [] };
          let beats = 0;
          db.measures.forEach(m => {
            if (beats + m.beats > 4) {
              this.currentSong.measures.push(cur);
              cur = { chords: [] };
              beats = 0;
            }
            cur.chords.push(m.chord);
            beats += m.beats;
          });
          if (cur.chords.length) this.currentSong.measures.push(cur);
          while (this.currentSong.measures.length < this.currentSong.grid.rows * this.currentSong.grid.cols) {
            this.currentSong.measures.push({ chords: [] });
          }

          document.getElementById('song-title').value = db.title;
          document.getElementById('bpm-slider').value = db.bpm;
          document.getElementById('bpm-value').textContent = db.bpm;
          this.showCreatedBy(db);
          this.render();

          // Aggiorna solo il pulsante like – NON richiama loadSongsList()
          this.updateLikeButton(db, currentUser);

        } catch (e) {
          console.error(e);
          YouJazz.showMessage("Errore", "Impossibile caricare il brano");
        }
      };

    } catch (e) {
      console.error('Error loading songs:', e);
    }
  }
}

const app = new GypsyApp();

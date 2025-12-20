const CHORDS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'P'];
const CHORD_EXTENSIONS = ['#', '♭', 'ø', 'o', '6', '7', '9', 'm', 'maj7', '♭9', '#9'];
const SONG_STYLES = ['swing', 'bossa'];

class GypsyApp {
  constructor() {
    this.player = new GypsyPlayer();
    this.currentSong = null;
    this.isPlaying = false;
    this.currentChordIndex = 0;
    this.FavFilterSearch = false;
    this.currentStyle = 'swing'; // default  
    this.initialize();
  }

  async initialize() {

    this.loadChordsPalette();
    this.setupMobileDragDrop();
    this.setupMobileChordMove();
    this.render();                    // mostra griglia vuota o messaggio
    this.loadSongsList();             // carica subito la dropdown
    this.setupGlobalEvents();
    this.setupEvents();
    this.setupPublicToggle();         // eventi sempre attivi (BPM, Play, Stop, ecc.)
    this.setupCopyPaste();
    this.setupFavouritesFilter();
    this.setupSaveAs();
    this.setupRename();
    this.setupTranspose();
    this.setupAIReharmonize();
    this.setupMobilePlaybackControls();
    this.showCreatedBy(null);

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



    // Chiude il menu cliccando fuori
    document.addEventListener('click', function () {
      const dropdown = document.getElementById('user-dropdown');
      if (dropdown) dropdown.style.display = 'none';
    });

    // Aggiorna anche il nome nel dropdown quando viene mostrato l'utente
    document.addEventListener('DOMContentLoaded', function () {
      const nameEl = document.getElementById('user-name');
      const dropdownName = document.getElementById('user-name-dropdown');
      if (nameEl && dropdownName) {
        dropdownName.textContent = nameEl.textContent;
      }
    });


    // === NUOVO CODICE UNICO PER DRAGOVER/DROP GLOBALE (sostituisci i vecchi 3 blocchi) ===
    document.addEventListener('dragover', e => {
      const measure = e.target.closest('.measure');
      if (measure) {
        e.preventDefault(); // permette il drop su tutte le misure
        if (e.dataTransfer.types.includes('youjazz/measure-clone') ||
          e.dataTransfer.getData('type') === 'chord') {
          measure.classList.add('drag-over');
        }
      }
    });

    document.addEventListener('dragleave', e => {
      const measure = e.target.closest('.measure');
      if (measure && !measure.contains(e.relatedTarget)) {
        measure.classList.remove('drag-over');
      }
    });

    document.addEventListener('drop', e => {
      // Rimuove il feedback visivo
      document.querySelectorAll('.measure').forEach(m => m.classList.remove('drag-over'));
    });

    // Icona manina con Ctrl (per copy)
    document.addEventListener('keydown', e => {
      if (e.key === ' ' || e.code === 'Space') {
        // ✅ FIX: Non triggerare play/stop se si sta scrivendo in un input
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable
        );

        if (!isTyping) {
          e.preventDefault(); // Previeni scroll della pagina
          if (this.isPlaying) this.stopPlayback(); else this.play();
        }
      }
      if (e.ctrlKey || e.metaKey) {
        document.body.classList.add('ctrl-drag');
      }
    });

    document.addEventListener('keyup', e => {
      if (e.key === 'Control' || e.key === 'Meta') {
        document.body.classList.remove('ctrl-drag');
      }
    });

    // HAMBURGER MENU - apertura/chiusura + chiusura automatica al click
    const hamburgerBtn = document.getElementById('hamburger-menu');
    const menu = document.getElementById('main-menu');

    hamburgerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    // Chiude il menu quando si clicca su un item
    document.querySelectorAll('#main-menu .menu-item').forEach(item => {
      item.addEventListener('click', () => {
        menu.classList.remove('show');
        document.body.style.overflow = ''; // sblocca scroll se era bloccato
      });
    });

    // Chiude cliccando fuori
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('show') &&
        !menu.contains(e.target) &&
        !hamburgerBtn.contains(e.target)) {
        menu.classList.remove('show');
      }
    });

  }

  setupTranspose() {
    const btn = document.getElementById('transpose-song');
    if (!btn) return;

    btn.onclick = async () => {
      if (!this.currentSong) {
        return YouJazz.showMessage("Error", "No song loaded");
      }

      if (this.isGuest()) {
        return YouJazz.showMessage("Permission denied", "Login to transpose songs");
      }

      const semitones = await YouJazz.showTranspose("Transpose Song", "Select semitones to transpose:");
      await new Promise(resolve => setTimeout(resolve, 100));

      if (semitones === null || semitones === 0) return;

      // Lista note in diesis (preferenza jazz comune)
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

      // Mappa per convertire bemolli in diesis
      const flatToSharp = {
        'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#',
        'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B'
      };

      const normalizeRoot = (root) => {
        return flatToSharp[root] || root;
      };

      const transposeChord = (chord) => {
        // Cattura la root: lettera + opzionale # o b
        const rootMatch = chord.match(/^([A-G](#|b)?)/i);
        if (!rootMatch) return chord;

        let root = rootMatch[0].toUpperCase(); // Normalizza case
        let rest = chord.slice(rootMatch[0].length);
        // Converti eventuali bemolli in diesis
        root = normalizeRoot(root);

        // Trova indice
        let idx = notes.indexOf(root);
        if (idx === -1) return chord; // Sicurezza

        // Trasponi
        idx = (idx + semitones + 120) % 12; // +120 per sicurezza con numeri negativi

        const newRoot = notes[idx];
        rest = rest.replace(/[b#]/, '');

        return newRoot + rest;
      };

      // Applica a tutti gli accordi
      this.currentSong.measures.forEach(measure => {
        measure.chords = measure.chords.map(transposeChord);
      });

      this.render();
      // YouJazz.showMessage("Success", `Song transposed by ${semitones > 0 ? '+' : ''}${semitones} semitones`);
    };
  }

  setupMobilePlaybackControls() {
    if (window.innerWidth > 768) return; // Solo su mobile

    let hideTimeout;
    const controlsToHide = [
      document.querySelector('.chord-palette'),
      document.querySelector('.player-controls')
    ];

    const hideControls = () => {
      if (!this.isPlaying) return;
      controlsToHide.forEach(el => {
        if (el) el.classList.add('mobile-hidden-playback');
      });
    };

    const showControls = () => {
      controlsToHide.forEach(el => {
        if (el) el.classList.remove('mobile-hidden-playback');
      });

      // Auto-hide dopo 3 secondi se in playback
      if (this.isPlaying) {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(hideControls, 3000);
      }
    };

    // Tap su schermo per mostrare/nascondere
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && this.isPlaying) {
        // Non triggherare se clicchi sui controlli stessi
        if (!e.target.closest('.chord-palette') &&
          !e.target.closest('.player-controls')) {
          showControls();
        }
      }
    });

    // Nascondi controlli quando inizia playback
    const originalPlay = this.play.bind(this);
    this.play = async function () {
      await originalPlay();
      if (window.innerWidth <= 768 && this.isPlaying) {
        setTimeout(() => {
          hideControls();
        }, 3000); // Nasconde dopo 3 secondi dall'avvio
      }
    };

    // Mostra controlli quando stoppa playback
    const originalStop = this.stopPlayback.bind(this);

    this.stopPlayback = function () {
      originalStop();
      if (window.innerWidth <= 768) {
        showControls();
        clearTimeout(hideTimeout);
      }
    };
  }



  setupPublicToggle() {


    const btn = document.getElementById('public-toggle-btn');
    if (!btn) return;

    // Set initial state based on current song or default to true
    const initialState = this.currentSong ? (this.currentSong.isPublic !== false) : true;
    //btn.classList.toggle('active', initialState);
    btn.disabled = !this.currentSong; // Disable if no song loaded

    btn.addEventListener('click', async () => {
      if (!this.currentSong) {
        YouJazz.showMessage("No Song", "Load or create a song first");
        return;
      }

      const newState = !btn.classList.contains('active');
      btn.classList.toggle('active', newState);
      this.currentSong.isPublic = newState;

      if (this.currentSong._id) {
        try {
          await Database.updatePublicStatus(this.currentSong._id, newState);
          YouJazz.showMessage("Visibility Updated", `Song is now ${newState ? 'public' : 'private'}`);
          await this.loadSongsList();
        } catch (err) {
          btn.classList.toggle('active', !newState);
          YouJazz.showMessage("Error", "Unable to update visibility");
        }
      }
    });
  }



  showCreatedBy(song) {
    let createdByEl = document.getElementsByClassName('created-by')[0];
    if (!song) {
      createdByEl.textContent = '';
      return;
    }
    else {
      const ownerName = this.getOwnerName(song);
      createdByEl.textContent = `Created by: ${ownerName}`;
    }
  }


  // Add this code to your GypsyApp constructor, after loadChordsPalette()

  setupMobileDragDrop() {
    let draggedChord = null;
    let draggedType = null;
    let draggedStyle = null;
    let touchStartElement = null;

    // Touch events for chord buttons
    document.addEventListener('touchstart', (e) => {
      const chordBtn = e.target.closest('.chord-btn');
      const extBtn = e.target.closest('.extension-btn');

      if (chordBtn) {
        touchStartElement = chordBtn;
        draggedChord = chordBtn.textContent;
        draggedType = 'chord';
        draggedStyle = this.currentStyle;

        // Visual feedback
        chordBtn.style.opacity = '0.5';
        e.preventDefault();
      } else if (extBtn) {
        touchStartElement = extBtn;
        draggedChord = extBtn.textContent;
        draggedType = 'extension';

        // Visual feedback
        extBtn.style.opacity = '0.5';
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!draggedChord) return;

      const touch = e.touches[0];
      const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);

      // Remove previous hover effects
      document.querySelectorAll('.measure').forEach(m => m.classList.remove('drag-over'));

      // Add hover effect to current measure
      const measure = elementAtPoint?.closest('.measure');
      if (measure) {
        measure.classList.add('drag-over');
      }

      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (!draggedChord) return;

      const touch = e.changedTouches[0];
      const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
      const measure = elementAtPoint?.closest('.measure');

      // Rimuovi effetti hover
      document.querySelectorAll('.measure').forEach(m => m.classList.remove('drag-over'));

      // Reset feedback visivo
      if (touchStartElement) {
        touchStartElement.style.opacity = '';
        touchStartElement = null;
      }

      if (measure && draggedType === 'chord') {
        // Inserimento di un accordo completo (es. "C7", "Dm", "G♭7♭9")
        const measureIndex = Array.from(document.querySelectorAll('.measure')).indexOf(measure);
        const measureData = this.currentSong.measures[measureIndex];

        if (measureData && measureData.chords.length < 4) {
          const rect = measure.getBoundingClientRect();
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;

          let insertIndex = measureData.chords.length;
          if (measureData.chords.length > 0) {
            if (x < rect.width / 2 && y < rect.height / 2) insertIndex = 0;
            else if (x >= rect.width / 2 && y < rect.height / 2) insertIndex = 1;
            else if (x >= rect.width / 2 && y >= rect.height / 2) insertIndex = 2;
            else if (x < rect.width / 2 && y >= rect.height / 2) insertIndex = 3;
          }

          measureData.chords.splice(insertIndex, 0, draggedChord);
          this._scrollY = window.scrollY; // Salva posizione scroll
          this._preventScroll = true;      // Flag per bloccare auto-scroll
          this.render();

          setTimeout(() => {
            const box = measure.querySelectorAll('.chord-box')[insertIndex];
            if (box) box.dataset.style = draggedStyle;
          }, 0);

          this.preloadIfNeeded(draggedChord);
        }

      } else if (measure && draggedType === 'extension') {
        const chordBox = elementAtPoint?.closest('.chord-box');
        if (!chordBox) return;

        const measureIndex = Array.from(document.querySelectorAll('.measure')).indexOf(measure);
        const measureData = this.currentSong.measures[measureIndex];
        const chordIndex = Array.from(measure.querySelectorAll('.chord-box')).indexOf(chordBox);

        if (chordIndex === -1) return;

        let currentChord = measureData.chords[chordIndex];
        let newChord = currentChord;

        // Estrai la root (C-G, opzionalmente con # o ♭)
        const rootMatch = currentChord.match(/^([A-G][#♭]?)/i);
        if (!rootMatch) return; // Sicurezza: accordo non valido
        const root = rootMatch[0]; // es. "C", "G♭", "F#"
        const rest = currentChord.slice(root.length); // tutto il resto

        // Applica l'estensione trascinata
        switch (draggedChord) {
          case '#':
          case '♭':
            // Modifica solo l'alterazione della root
            newChord = currentChord[0] + draggedChord + currentChord.slice(2);
            break;

          case 'ø':
          case 'o':
            // Sostituisce qualsiasi estensione con ø o o (accordi diminuiti)
            newChord = root + draggedChord;
            break;

          case 'm':
            // Rimuove maj7 o numeri, aggiunge m (tranne se già presente)
            newChord = root + (rest.includes('maj7') ? '' : rest.replace(/(maj)?[0-9♭#]*/g, '')) + 'm';
            break;

          case 'maj7':
            // Sostituisce estensioni numeriche/minori con maj7
            newChord = root + rest.replace(/(m|[0-9♭#])*/g, '') + 'maj7';
            break;

          case '6':
          case '7':
          case '9':
            // Sostituisce eventuali numeri finali, mantiene m se presente
            const base = rest.replace(/[0-9♭#]+$/, '');
            newChord = root + base + draggedChord;
            break;

          case '♭9':
          case '#9':
            // Aggiunge ♭9 o #9 solo se c'è già un 7 (o lo aggiunge se non c'è)
            if (rest.includes('7')) {
              newChord = root + rest.replace(/[♭#]?9$/, '') + draggedChord;
            } else {
              // Se non c'è 7, lo aggiungiamo prima (es. C + ♭9 → C7♭9)
              const base = rest.replace(/[0-9♭#]+$/, '');
              newChord = root + base + '7' + draggedChord;
            }
            break;

          default:
            return; // Estensione non riconosciuta
        }

        measureData.chords[chordIndex] = newChord;
        this.preloadIfNeeded(newChord);
        this.render();
      }

      // Reset stato drag
      draggedChord = null;
      draggedType = null;
      draggedStyle = null;

      e.preventDefault();
    }, { passive: false });

    // === NUOVO: ABILITA SCROLL SU SWIPE PER PALETTE MOBILE ===
    if (window.innerWidth <= 768) {
      const enableScrollOnSwipe = (container) => {
        let isScrolling = false;
        let startX = 0;
        let scrollLeft = 0;

        container.addEventListener('touchstart', (e) => {
          // Solo se il touch è sul container, non sui pulsanti durante drag
          if (e.target.closest('.chord-btn') || e.target.closest('.extension-btn')) {
            startX = e.touches[0].pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
            isScrolling = true;
          }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
          if (!isScrolling) return;

          const x = e.touches[0].pageX - container.offsetLeft;
          const walk = (x - startX) * 2; // Moltiplicatore per velocità scroll
          container.scrollLeft = scrollLeft - walk;
        }, { passive: true });

        container.addEventListener('touchend', () => {
          isScrolling = false;
        }, { passive: true });
      };

      const chordList = document.querySelector('.chord-list');
      const extList = document.querySelector('.extension-list');

      if (chordList) enableScrollOnSwipe(chordList);
      if (extList) enableScrollOnSwipe(extList);
    }

  }

  setupMobileChordMove() {
    if (window.innerWidth > 768) return; // Solo mobile

    let longPressTimer = null;
    let isDragging = false;
    let draggedChord = null;
    let draggedMeasure = null;
    let draggedChordIndex = null;
    let touchStartElement = null;

    document.addEventListener('touchstart', (e) => {
      const chordBox = e.target.closest('.chord-box');
      if (!chordBox || this.isGuest()) return;

      touchStartElement = chordBox;

      // Trova misura e indice accordo
      const measure = chordBox.closest('.measure');
      if (!measure) return;

      const measureIndex = Array.from(document.querySelectorAll('.measure')).indexOf(measure);
      const chordIndex = Array.from(measure.querySelectorAll('.chord-box')).indexOf(chordBox);

      // Long press timer (500ms)
      longPressTimer = setTimeout(() => {
        isDragging = true;
        draggedChord = this.currentSong.measures[measureIndex].chords[chordIndex];
        draggedMeasure = measureIndex;
        draggedChordIndex = chordIndex;

        // Feedback visivo
        chordBox.style.opacity = '0.6';
        chordBox.style.transform = 'scale(1.15)';
        chordBox.style.transition = 'all 0.2s';

        // Vibrazione (se supportata)
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);

    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging) {
        // Cancella timer se l'utente muove il dito prima del long press
        clearTimeout(longPressTimer);
        return;
      }

      e.preventDefault();

      const touch = e.touches[0];
      const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);

      // Rimuovi highlight precedente
      document.querySelectorAll('.measure').forEach(m => m.classList.remove('drag-over'));

      // Aggiungi highlight alla misura target
      const targetMeasure = elementAtPoint?.closest('.measure');
      if (targetMeasure) {
        targetMeasure.classList.add('drag-over');
      }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      clearTimeout(longPressTimer);

      if (!isDragging) {
        if (touchStartElement) {
          touchStartElement.style.opacity = '';
          touchStartElement.style.transform = '';
        }
        return;
      }

      const touch = e.changedTouches[0];
      const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetMeasure = elementAtPoint?.closest('.measure');

      // Rimuovi feedback
      document.querySelectorAll('.measure').forEach(m => m.classList.remove('drag-over'));
      if (touchStartElement) {
        touchStartElement.style.opacity = '';
        touchStartElement.style.transform = '';
      }

      if (targetMeasure) {
        const targetMeasureIndex = Array.from(document.querySelectorAll('.measure')).indexOf(targetMeasure);
        const targetChordBox = elementAtPoint?.closest('.chord-box');

        // Rimuovi dalla misura originale
        this.currentSong.measures[draggedMeasure].chords.splice(draggedChordIndex, 1);

        if (targetChordBox) {
          // Inserisci nella posizione specifica
          const targetChordIndex = Array.from(targetMeasure.querySelectorAll('.chord-box')).indexOf(targetChordBox);
          this.currentSong.measures[targetMeasureIndex].chords.splice(targetChordIndex, 0, draggedChord);
        } else {
          // Aggiungi in fondo alla misura
          this.currentSong.measures[targetMeasureIndex].chords.push(draggedChord);
        }

        this._scrollY = window.scrollY;
        this._preventScroll = true;
        this.render();
      }

      // Reset stato
      isDragging = false;
      draggedChord = null;
      draggedMeasure = null;
      draggedChordIndex = null;
      touchStartElement = null;

    }, { passive: false });
  } s


  isGuest() {
    return document.body.classList.contains('guest-mode');
  }

  updateUIControls() {
    const isPlaying = this.isPlaying;

    const addRowBtn = document.getElementById('add-row');
    if (addRowBtn) {
      const canAddRow = this.currentSong &&
        !this.currentSong._id &&
        !isPlaying &&
        !this.isGuest();
      addRowBtn.disabled = !canAddRow;
    }

    // Play / Stop / Clear Grid buttons
    document.getElementById('play').disabled = isPlaying;
    document.getElementById('stop').disabled = !isPlaying;
    document.getElementById('add-row').disabled = isPlaying;

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
      const rows_temp = parseInt(document.getElementById('grid-rows').value) || 4;
      const cols_temp = parseInt(document.getElementById('grid-cols').value) || 4;
      let rows = 0;
      let cols = 0;
      if (rows_temp < 1 || rows_temp > 10) { rows = 4 } else { rows = rows_temp };
      if (cols_temp < 1 || cols_temp > 10) { cols = 4 } else { cols = cols_temp };

      // Crea il nuovo brano
      this.currentSong = {
        title: 'Song name',
        style: this.currentStyle,
        isPublic: false,
        bpm: 120,
        grid: { rows, cols },
        measures: Array(rows * cols).fill(null).map(() => ({ chords: [] }))
      };

      // Resetta il titolo nel campo input
      this.loadSongsList();
      //document.getElementById('song-title').value = 'Song name';
      document.getElementById('bpm-slider').value = 120;
      document.getElementById('bpm-value').textContent = '120';

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



    document.getElementById('play').onclick = () => this.play();
    document.getElementById('stop').onclick = () => this.stopPlayback();

    document.getElementById('add-row').onclick = () => {
      if (!this.currentSong || this.currentSong._id || this.isPlaying) return;

      const cols = this.currentSong.grid.cols;
      const newRow = Array(cols).fill(null).map(() => ({ chords: [] }));
      this.currentSong.measures.push(...newRow);
      this.currentSong.grid.rows++;

      this.render();
      YouJazz.showMessage("Row Added", `New row added (${this.currentSong.grid.rows}x${cols})`);
    };


    document.getElementById('save-song').onclick = () => {
      if (this.isGuest()) {

        YouJazz.showMessage("Permission denied", "Guest mode: You cannot save songs. Login to save.");
        return;
      }
      this.saveSong();
    };

    document.getElementById('fav-search-toggle').onclick = () => {
      if (this.isGuest()) {

        YouJazz.showMessage("Permission denied", "Guest mode: You cannot filter. Login to save.");
        return;
      }
      this.FavFilterSearch = !this.FavFilterSearch;
      if (this.FavFilterSearch)
        document.getElementById('fav-search-toggle').innerHTML =
          `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Show All Songs`;
      else document.getElementById('fav-search-toggle').innerHTML =
        `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Show Only Favourite Songs`;

      //refresh song list
      try {
        this.loadSongsList();
      } catch (err) {
        console.error("Error loading songs list with favourites filter:", err);
      }
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
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlPressed = true;
        document.body.classList.add('ctrl-copy-mode'); // ✅ AGGIUNGI classe per CSS
      }
    });

    document.addEventListener('keyup', e => {
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlPressed = false;
        document.body.classList.remove('ctrl-copy-mode'); // ✅ RIMUOVI classe

        // ✅ Rimuovi evidenziazioni
        document.querySelectorAll('.chord-box, .measure').forEach(el => {
          el.classList.remove('copy-hover');
        });
      }
    });

    // ✅ NUOVO: Evidenziazione durante hover con Ctrl
    document.addEventListener('mouseover', e => {
      if (!isCtrlPressed) return;

      const chordBox = e.target.closest('.chord-box');
      const measure = e.target.closest('.measure');

      // Evidenzia chord box
      if (chordBox) {
        chordBox.classList.add('copy-hover');
      }

      // Evidenzia measure (solo se ha accordi)
      if (measure && measure.querySelectorAll('.chord-box').length > 0) {
        measure.classList.add('copy-hover');
      }
    });

    document.addEventListener('mouseout', e => {
      if (!isCtrlPressed) return;

      const chordBox = e.target.closest('.chord-box');
      const measure = e.target.closest('.measure');

      if (chordBox) {
        chordBox.classList.remove('copy-hover');
      }

      if (measure) {
        measure.classList.remove('copy-hover');
      }
    });

    document.addEventListener('mousedown', e => {
      if (!this.currentSong || !isCtrlPressed) return;

      const box = e.target.closest('.chord-box');
      if (!box) return;

      sourceChord = box.firstChild.textContent.trim();
      sourceBox = box;
      e.preventDefault();

      sourceBox.style.opacity = '0.6';
      sourceBox.style.transform = 'scale(1.12)';
      sourceBox.style.transition = 'all 0.12s';

      // ✅ AGGIUNGI: Crea ghost visibile
      this._createCopyGhost(sourceChord, e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', e => {
      if (!sourceChord || !sourceBox) return;

      const targetMeasure = e.target.closest('.measure');
      if (!targetMeasure) {
        this._removeCopyGhost(); // ✅ AGGIUNGI
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

      // ✅ Rimuovi ghost
      this._removeCopyGhost();

      // Reset
      sourceBox.style.opacity = '';
      sourceBox.style.transform = '';
      sourceChord = null;
      sourceBox = null;
    });
  }


  _createCopyGhost(chordText, x, y) {
    // Rimuovi ghost precedente se esiste
    this._removeCopyGhost();

    const ghost = document.createElement('div');
    ghost.id = 'copy-ghost';
    ghost.textContent = chordText;
    ghost.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    color: white;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 1.3em;
    font-weight: bold;
    pointer-events: none;
    z-index: 10000;
    box-shadow: 0 8px 30px rgba(39, 174, 96, 0.6);
    transform: translate(-50%, -50%) scale(1.1);
    border: 3px solid #fff;
    opacity: 0.9;
  `;

    document.body.appendChild(ghost);

    // ✅ Aggiorna posizione ghost durante movimento
    const moveHandler = (e) => {
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
    };

    document.addEventListener('mousemove', moveHandler);
    ghost.dataset.moveHandler = 'attached'; // Flag per cleanup
    this._ghostMoveHandler = moveHandler; // Salva riferimento
  }

  _removeCopyGhost() {
    const ghost = document.getElementById('copy-ghost');
    if (ghost) {
      if (this._ghostMoveHandler) {
        document.removeEventListener('mousemove', this._ghostMoveHandler);
        this._ghostMoveHandler = null;
      }
      ghost.remove();
    }
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

    const publicBtn = document.getElementById('public-toggle-btn');
    if (publicBtn) {
      if (this.currentSong) {
        publicBtn.classList.toggle('active', this.currentSong.isPublic !== false);
        publicBtn.disabled = false;
      } else {
        publicBtn.classList.remove('active');
        publicBtn.disabled = true;
      }
    }

    if (!this.currentSong) {
      sheet.innerHTML = `
        <div style="
          height: 70vh;
          display: flex;
          flex-direction: column;
          align-items: left;
          justify-content: center;
          text-align: left;
          color: #999;
          pointer-events: none;
          user-select: none;
        ">
          <p style="
            font-size: 1.FontSize;
            font-style: italic;
            margin: 0 20px 30px;
            line-height: 1.5;
          ">
            Create a new song or load one from the list <br/><br/>

            How to use YouJazz.org: <br/>
              - use drag and drop chords into the grid.<br/>
              - use the extension buttons to modify chords (minor, 7th, diminished, etc.).<br/>
              - user ctrl + drag to copy chords or entire measures.<br/>
              - use the style tabs to change the rhythm style (swing, bossa).<br/>
              - set the BPM with the slider.<br/>
              - save your songs as private or public.<br/>
              - save as to save a copy of other user songs<br/>
              - create your favirite songs list.<br/>
              - choose the song title.<br/>
              - transpose songs with the transpose feature.<br/>
              - use AI powered Reharmonization feature to get chord suggestions.<br/>
              - save your song to your account.   
          </p>

        </div>
      `;

      return;
    }

    sheet.innerHTML = '';
    sheet.style.gridTemplateColumns = `repeat(${this.currentSong.grid.cols}, 1fr)`;

    this.currentSong.measures.forEach((measureData, measureIndex) => {
      const measure = document.createElement('div');
      measure.className = 'measure' + (measureData.chords.length === 0 ? ' empty' : '');
      measure.dataset.index = measureIndex;

      // === 1. DROP DALLA PALETTE (singolo accordo) ===
      measure.ondragover = e => e.preventDefault();

      measure.ondrop = e => {
        e.preventDefault();
        e.stopPropagation();

        const droppedText = e.dataTransfer.getData('text/plain');
        const type = e.dataTransfer.getData('type');
        const style = e.dataTransfer.getData('style') || 'swing';

        // DROP ACCORDO SINGOLO
        if (type === 'chord' && droppedText && measureData.chords.length < 4) {
          const rect = measure.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          let insertIndex = measureData.chords.length; // default: in fondo

          if (measureData.chords.length > 0) {
            // Divisione semplice e perfetta in 4 quadranti (orario)
            if (x < rect.width / 2 && y < rect.height / 2) insertIndex = 0;     // alto-sinistra
            else if (x >= rect.width / 2 && y < rect.height / 2) insertIndex = 1; // alto-destra
            else if (x >= rect.width / 2 && y >= rect.height / 2) insertIndex = 2; // basso-destra
            else if (x < rect.width / 2 && y >= rect.height / 2) insertIndex = 3;  // basso-sinistra
          }

          measureData.chords.splice(insertIndex, 0, droppedText);
          this._scrollY = window.scrollY; // Salva posizione scroll
          this._preventScroll = true;      // Flag per bloccare auto-scroll
          this.render();

          setTimeout(() => {
            const box = measure.querySelectorAll('.chord-box')[insertIndex];
            if (box) box.dataset.style = style;
          }, 0);

          this.preloadIfNeeded(droppedText);
          return;
        }

        // DROP MISURA INTERA (copia/sposta) – invariato
        // DROP MISURA INTERA (sposta di default, copia con Ctrl)
        const cloneData = e.dataTransfer.getData('youjazz/measure-clone');
        if (cloneData) {
          try {
            const chords = JSON.parse(cloneData);
            const srcIdx = parseInt(e.dataTransfer.getData('youjazz/source-index'));

            // Copia gli accordi nella cella di destinazione
            this.currentSong.measures[measureIndex] = { chords: [...chords] };

            // LOGICA: SENZA Ctrl → SPOSTA (svuota origine), CON Ctrl → COPIA (lascia origine)
            if (!(e.ctrlKey || e.metaKey) && !isNaN(srcIdx) && srcIdx !== measureIndex) {
              this.currentSong.measures[srcIdx] = { chords: [] };
            }

            this.render();
          } catch (err) {
            console.error("Errore drop misura:", err);
          }
        }
      };

      // === FEEDBACK VISIVO DRAG OVER (opzionale ma bello) ===
      measure.addEventListener('dragenter', e => {
        if (e.dataTransfer.types.includes('youjazz/measure-clone') || e.dataTransfer.getData('type') === 'chord') {
          measure.classList.add('drag-over');
        }
      });

      measure.addEventListener('dragleave', () => {
        measure.classList.remove('drag-over');
      });

      // Reset contenuto
      measure.style.cssText = '';
      measure.innerHTML = '';

      if (measureData.chords.length === 0) {
        measure.classList.add('empty');
      } else {
        measure.classList.remove('empty');

        if (measureData.chords.length <= 2) {
          measure.style.display = 'flex';
          measure.style.justifyContent = 'space-around';
          measure.style.alignItems = 'center';

          measureData.chords.forEach((chord, i) => {
            const box = this.createChordBox(chord, i, measureData, measureIndex);
            box.style.fontSize = '1.4em';
            measure.appendChild(box);
          });

        } else {
          measure.style.display = 'grid';
          measure.style.gridTemplateColumns = '1fr 1fr';
          measure.style.gridTemplateRows = '1fr 1fr';
          measure.style.gap = '4px';
          measure.style.padding = '4px';
          measure.style.background = 'rgba(40,40,40,0.9)';
          measure.style.borderRadius = '6px';

          const positions = [
            { row: 1, col: 1, idx: 0 },
            { row: 1, col: 2, idx: 1 },
            { row: 2, col: 2, idx: 2 },
            { row: 2, col: 1, idx: 3 }
          ];

          positions.forEach((pos, i) => {
            if (i >= measureData.chords.length) return;

            const cell = document.createElement('div');
            cell.style.display = 'flex';
            cell.style.alignItems = 'center';
            cell.style.justifyContent = 'center';
            cell.style.background = 'rgba(30,30,30,0.8)';
            cell.style.borderRadius = '4px';
            cell.style.minHeight = '36px';

            const chord = measureData.chords[pos.idx];
            const box = this.createChordBox(chord, pos.idx, measureData, measureIndex);
            box.style.fontSize = '1.05em';
            box.style.lineHeight = '1.1';
            box.classList.add('sub-chord-box');

            cell.appendChild(box);
            measure.appendChild(cell);
          });
        }

        // Rendi l'intera misura draggabile (solo sfondo)
        this.makeMeasureDraggable(measure, measureData.chords);
      }

      sheet.appendChild(measure);
      if (this._preventScroll) {
        const scrollY = this._scrollY || 0;
        setTimeout(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
          this._preventScroll = false;
        }, 0);
      }
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
      document.getElementById('add-row').style.display = '';
      const notice = document.getElementById('guest-notice');
      if (notice) notice.remove();
    }
    // Update public button state after render
    const publicBtn2 = document.getElementById('public-toggle-btn');
    if (publicBtn2 && this.currentSong) {
      publicBtn2.classList.toggle('active', this.currentSong.isPublic !== false);
      publicBtn2.disabled = false;
    }

  }

  makeMeasureDraggable(measureEl, chords) {
    measureEl.draggable = true;

    measureEl.addEventListener('dragstart', e => {
      if (e.target.closest('.chord-box')) {
        return;
      }

      if (chords.length === 0) {
        e.preventDefault();
        return;
      }

      const measureIndex = measureEl.dataset.index;

      e.dataTransfer.setData('youjazz/measure-clone', JSON.stringify(chords));
      e.dataTransfer.setData('youjazz/source-index', measureIndex);
      e.dataTransfer.setData('text/plain', chords.join(' '));
      e.dataTransfer.effectAllowed = 'copyMove';

      // ✅ Ghost con indicazione copy/move
      const isCopy = e.ctrlKey || e.metaKey;
      const ghost = document.createElement('div');

      // ✅ Icona + testo
      const icon = isCopy ? '📋' : '✂️';
      const action = isCopy ? 'COPY' : 'MOVE';

      ghost.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:2em;">${icon}</span>
      <div>
        <div style="font-size:0.8em;opacity:0.8;margin-bottom:4px;">${action}</div>
        <div>${chords.join('  │  ')}</div>
      </div>
    </div>
  `;

      ghost.style.cssText = `
    position: absolute; top: -9999px; left: -9999px;
    background: linear-gradient(135deg, ${isCopy ? '#27ae60, #2ecc71' : '#6a1b9a, #8e24aa'});
    color: white; padding: 16px 24px; border-radius: 12px;
    font-size: 1.4em; font-weight: bold; font-family: system-ui;
    border: 3px solid ${isCopy ? '#fff' : '#e91e63'}; 
    box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    pointer-events: none; white-space: nowrap; z-index: 9999;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  `;

      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
      setTimeout(() => ghost.remove(), 0);
    });
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
    // === FIX DEFINITIVO: permetti drop di accordi SOPRA il chord-box ===
    box.addEventListener('dragover', e => {
      const type = e.dataTransfer.getData('type');
      if (type === 'chord' || type === 'extension') {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    box.addEventListener('drop', e => {
      const type = e.dataTransfer.getData('type');

      // Se è un'estensione → applichiamo la logica sul chord-box corrente
      if (type === 'extension') {
        e.preventDefault();
        e.stopPropagation();

        const droppedText = e.dataTransfer.getData('text/plain');
        let currentChord = chord; // 'chord' è la variabile esistente con l'accordo corrente
        let newChord = currentChord;

        // Estrai la root (C-G, opzionalmente con # o ♭)
        const rootMatch = currentChord.match(/^([A-G][#♭]?)/i);
        if (!rootMatch) return; // Sicurezza: accordo non valido

        const root = rootMatch[0]; // es. "C", "G♭", "F#"
        const rest = currentChord.slice(root.length); // tutto dopo la root

        // Applica l'estensione droppata
        switch (droppedText) {
          case '#':
          case '♭':
            // Cambia solo l'alterazione della root (es. C → C#, Db → D♭, ecc.)
            newChord = currentChord[0] + droppedText + currentChord.slice(2);
            break;

          case 'ø':
          case 'o':
            // Accordo semidiminuito o diminuito: sostituisce tutto il resto
            newChord = root + droppedText;
            break;

          case 'm':
            // Aggiunge 'm', rimuovendo eventuali maj7 o estensioni numeriche
            // Ma mantiene altre alterazioni se presenti (es. C7#9 → Cm)
            newChord = root + rest.replace(/(maj)?[0-9♭#]*/g, '') + 'm';
            break;

          case 'maj7':
            // Sostituisce estensioni minori/numeriche con maj7
            newChord = root + rest.replace(/(m|[0-9♭#])*/g, '') + 'maj7';
            break;

          case '6':
          case '7':
          case '9':
            // Sostituisce l'eventuale numero finale, mantiene 'm' o 'maj' se presente
            const base = rest.replace(/[0-9♭#]+$/, '');
            newChord = root + base + droppedText;
            break;

          case '♭9':
          case '#9':
            // Aggiunge ♭9 o #9: richiede (o aggiunge) il 7
            if (rest.includes('7')) {
              // Già c'è un 7 → sostituisci o aggiungi la nona alterata
              newChord = root + rest.replace(/[♭#]?9$/, '') + droppedText;
            } else {
              // Non c'è 7 → lo aggiungiamo prima della nona
              const base = rest.replace(/[0-9♭#]+$/, '');
              newChord = root + base + '7' + droppedText;
            }
            break;

          default:
            // Estensione non riconosciuta → niente
            return;
        }

        // Applica il nuovo accordo
        measure.chords[index] = newChord;
        this.preloadIfNeeded(newChord);
        this.render();
        return;
      }

      // Se è un accordo completo dalla palette → lascia propagare l'evento alla misura
      // (la misura deciderà dove inserirlo tra i 4 slot)
    });

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

    // ✅ FIX: Ferma playback precedente se ancora attivo
    if (this.player) {
      this.player.stop();
    }

    if (this.currentSong?._id) {
      Database.incrementPlayCount(this.currentSong._id);
    }

    this.isPlaying = true;
    this.currentChordIndex = 0; // ✅ Reset indice per ripartire sempre dall'inizio
    this.updateUIControls();

    // Pulizia highlight residuo
    document.querySelectorAll('.chord-box, .sub-chord-box').forEach(el => el.classList.remove('playing'));
    document.querySelectorAll('.measure').forEach(m => m.classList.remove('measure-playing'));

    // Costruisci sequenza CON MAPPING POSIZIONI
    const seq = [];
    const beatCounts = [];
    const chordPositions = []; // Array che mappa indice → {measureIndex, chordIndex}

    this.currentSong.measures.forEach((m, measureIndex) => {
      if (m.chords.length === 0) return;
      const beatsPerChord = 4 / m.chords.length;
      m.chords.forEach((ch, chordIndex) => {
        seq.push(ch);
        beatCounts.push(beatsPerChord);
        chordPositions.push({ measureIndex, chordIndex }); // Salva posizione esatta
      });
    });

    if (seq.length === 0) {
      YouJazz.showMessage("Playback Error", "No chords to play!");
      this.isPlaying = false;
      this.updateUIControls();
      return;
    }

    // Preload TUTTI i buffer
    document.getElementById('audio-spinner').classList.remove('hidden');
    try {
      const preloadResults = await Promise.allSettled(seq.map(ch => {
        const box = document.querySelector(`.chord-box[textContent="${ch}"]`);
        const style = box?.dataset.style || this.currentStyle;
        return this.player.load(ch, style);
      }));

      // ✅ VERIFICA SE CI SONO ACCORDI NON TROVATI
      const failed = preloadResults.filter(r => r.status === 'rejected');

      if (failed.length > 0) {
        console.error('Accordi non trovati:', failed);
        YouJazz.showMessage("Unable to Play", "Unable to play all the chords of this song version");
        this.isPlaying = false;
        this.updateUIControls();
        document.getElementById('audio-spinner').classList.add('hidden');
        return;
      }

    } catch (err) {
      console.error("Preload error:", err);
      YouJazz.showMessage("Playback Error", "An error occurred while loading audio samples.");
      this.isPlaying = false;
      this.updateUIControls();
      document.getElementById('audio-spinner').classList.add('hidden');
      return;
    }
    document.getElementById('audio-spinner').classList.add('hidden');

    // CALLBACK HIGHLIGHT PER POSIZIONE ESATTA
    const onChordPlay = (index, chordName) => {
      // Rimuovi evidenziazione precedente
      document.querySelectorAll('.chord-box, .sub-chord-box').forEach(el => el.classList.remove('playing'));
      document.querySelectorAll('.measure').forEach(m => m.classList.remove('measure-playing'));

      // Trova la posizione esatta dell'accordo corrente
      const pos = chordPositions[index];
      if (!pos) return;

      // Trova la misura specifica
      const measures = document.querySelectorAll('.measure');
      const measure = measures[pos.measureIndex];
      if (!measure) return;

      // Trova il chord-box specifico dentro quella misura
      const boxes = measure.querySelectorAll('.chord-box, .sub-chord-box');
      const box = boxes[pos.chordIndex];

      if (box) {
        box.classList.add('playing');
        measure.classList.add('measure-playing');

        // AUTO-SCROLL SOLO SU MOBILE
        if (window.innerWidth <= 768) {
          const measureRect = measure.getBoundingClientRect();
          const screenCenter = window.innerHeight / 2;
          const measureCenter = measureRect.top + measureRect.height / 2;
          const offset = measureCenter - screenCenter;

          if (Math.abs(offset) > 50) {
            window.scrollBy({
              top: offset,
              behavior: 'smooth'
            });
          }
        }
      }
    };

    const onEnd = () => {
      document.querySelectorAll('.chord-box, .sub-chord-box').forEach(el => el.classList.remove('playing'));
      document.querySelectorAll('.measure').forEach(m => m.classList.remove('measure-playing'));
    };

    // Avvia con count-in integrato
    try {
      this.player.playVariableSequence(
        seq,
        this.currentStyle,
        beatCounts.map(b => b * (60 / this.currentSong.bpm)),
        this.currentSong.bpm,
        onChordPlay,
        onEnd,
        true  // enableCountIn
      );

    } catch (err) {
      console.error("Playback error:", err);
      YouJazz.showMessage("Playback Error", "An error occurred during playback.");
      this.isPlaying = false;
      this.updateUIControls();
    }
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
    this.currentChordIndex = 0; // ✅ Reset indice accordo corrente

    // ✅ FIX: Rimuovi tutte le evidenziazioni quando stoppi
    document.querySelectorAll('.chord-box, .sub-chord-box').forEach(el => {
      el.classList.remove('playing');
    });
    document.querySelectorAll('.measure').forEach(m => {
      m.classList.remove('measure-playing');
    });

    this.updateUIControls();
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

    // ✅ CHIEDI IL TITOLO SE NON ESISTE
    if (!this.currentSong._id) {
      const title = await YouJazz.showPrompt(
        "Save New Song",
        "Enter song title:",
        "Untitled Song"
      );

      this.currentSong.title = title.trim();
    }

    this.currentSong.style = this.currentStyle;

    try {
      const userRes = await fetch('/auth/me', { credentials: 'include' });
      if (!userRes.ok) throw new Error('Unauthenticated');

      const currentUser = await userRes.json();

      if (this.currentSong._id) {
        const songRes = await fetch(`/api/songs/${this.currentSong._id}`, { credentials: 'include' });
        if (!songRes.ok) throw new Error('Unable to verify song owner');

        const songFromServer = await songRes.json();
        if (songFromServer.owner._id.toString() !== currentUser.id) {
          YouJazz.showMessage("YouJazz", "This song is not yours. You cannot modify it!");
          await this.loadSongsList();
          return;
        }
      }

      const saved = await Database.saveSong(this.currentSong);

      if (!this.currentSong._id) {
        this.currentSong._id = saved._id;
      }
      YouJazz.showMessage("YouJazz", `Song "${this.currentSong.title}" saved successfully!`);
      await this.loadSongsList();

      // ✅ FIX: Seleziona il brano appena salvato
      const input = document.getElementById('song-list-input');
      if (input && this._allSongs && this.currentSong._id) {
        const savedSong = this._allSongs.find(s => s.id === this.currentSong._id);
        if (savedSong) {
          input.value = savedSong.displayText;
        }
      }

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
      //document.getElementById('song-title').value = 'Song name';
    } catch (e) {
      console.error('Saving error:', e);
      YouJazz.showMessage("Save Error", "Unable to save the song. Are you logged in?");
    }
  }

  setupRename() {
    const btn = document.getElementById('rename-song');
    if (!btn) return;

    btn.onclick = async () => {
      if (!this.currentSong?._id) {
        return YouJazz.showMessage("Error", "No song loaded");
      }

      if (this.isGuest()) {
        return YouJazz.showMessage("Permission denied", "Login to rename songs");
      }

      // Verifica ownership
      try {
        let userRes = null;
        if (!this.isGuest()) userRes = await fetch('/auth/me', { credentials: 'include' });
        if (!userRes.ok) throw new Error('Unauthenticated');

        const currentUser = await userRes.json();
        const songRes = await fetch(`/api/songs/${this.currentSong._id}`, { credentials: 'include' });
        if (!songRes.ok) throw new Error('Unable to verify song owner');

        const songFromServer = await songRes.json();
        if (songFromServer.owner._id.toString() !== currentUser.id) {
          return YouJazz.showMessage("Permission denied", "You can only rename your own songs");
        }

        const newTitle = await YouJazz.showPrompt(
          "Rename Song",
          "Enter new title:",
          this.currentSong.title
        );

        if (!newTitle || newTitle.trim() === '') {
          return YouJazz.showMessage("Cancelled", "Rename cancelled");
        }

        this.currentSong.title = newTitle.trim();
        await Database.saveSong(this.currentSong);

        YouJazz.showMessage("Success", `Song renamed to "${newTitle}"`);
        await this.loadSongsList();

      } catch (e) {
        console.error('Rename error:', e);
        YouJazz.showMessage("Error", "Unable to rename song");
      }
    };
  }

  updateFavButton(song, currentUser) {

    let favBtn = document.getElementById('fav-btn');

    if (!song?._id) {
      favBtn.style.display = 'none';
      return;
    }

    //favBtn.style.display = 'inline-block';
    const favs = song.favourites?.length || 0;
    //favBtn.querySelector('#fav-count').textContent = favs;

    const isFavourite = currentUser && song.favourites?.includes(currentUser.id);
    favBtn.classList.toggle('liked', isFavourite);
    favBtn.disabled = !currentUser;
    favBtn.onclick = null;
    favBtn.onclick = async () => {
      if (!currentUser) {
        YouJazz.showMessage("Login required", "Login to add favourites");
        return;
      }

      try {
        const res = await Database.toggleFavourite(song._id);

        favBtn.classList.toggle('liked', res.isFavourite);

        await this.loadSongsList();

      } catch (err) {
        YouJazz.showMessage("Error", "Unable to update favourite");
      }
    };
  }


  setupFavouritesFilter() {
    const btn = document.getElementById('filter-favourites');
    if (!btn) return;

    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      this.loadSongsList();
    });
  }
  async setupSaveAs() {
    const btn = document.getElementById('save-as-song');

    if (!btn) return;

    btn.onclick = async () => {
      if (!this.currentSong) {
        return YouJazz.showMessage("Error", "No song loaded");
      }

      if (this.isGuest()) {
        return YouJazz.showMessage("Permission denied", "Login to save songs");
      }

      const confirmed = await YouJazz.showConfirm(
        "Save As Copy",
        `Create a personal copy of "${this.currentSong.title}"?`,
        "Yes, save copy",
        "Cancel"
      );

      if (!confirmed) return;

      // ✅ CHIEDI IL NUOVO TITOLO
      const newTitle = await YouJazz.showPrompt(
        "Save As",
        "Enter title for the copy:",
        `${this.currentSong.title} (copy)`
      );

      if (!newTitle || newTitle.trim() === '') {
        return YouJazz.showMessage("Cancelled", "Save cancelled");
      }

      try {
        const dbSong = {
          title: newTitle.trim(), // ← USA IL NUOVO TITOLO
          bpm: this.currentSong.bpm, bpm: this.currentSong.bpm,
          style: this.currentSong.style,
          grid: this.currentSong.grid,
          measures: []
        };

        this.currentSong.measures.forEach(measure => {
          if (measure.chords.length === 0) return;
          const realChords = measure.chords.filter(c => c !== '%');
          if (realChords.length === 0) return;
          const beatsPerChord = 4 / realChords.length;
          realChords.forEach(chord => {
            dbSong.measures.push({ chord, beats: beatsPerChord });
          });
        });

        const saved = await Database.saveAs(dbSong);
        this.currentSong._id = saved._id;
        this.currentSong.title = saved.title;
        //document.getElementById('song-title').value = saved.title;

        YouJazz.showMessage("Success", `Song saved as "${saved.title}"`);
        await this.loadSongsList();

      } catch (e) {
        console.error('Save as error:', e);
        YouJazz.showMessage("Error", "Unable to save copy");
      }
    };
  };


  async setupAIReharmonize() {
    const btn = document.getElementById('ai-reharmonize');
    if (!btn) return;

    btn.onclick = async () => {
      if (!this.currentSong || this.currentSong.measures.length === 0) {
        return YouJazz.showMessage("Error", "No song loaded");
      }

      if (this.isGuest()) {
        return YouJazz.showMessage("Permission denied", "Login to use AI features");
      }

      const confirmed = await YouJazz.showConfirm(
        "YouJazz AI Reharmonization 🤖",
        "Generate an alternative jazz version of this progression?",
        "Yes, do it!",
        "Cancel"
      );

      if (!confirmed) return;


      document.getElementById('ai-spinner').classList.remove('hidden');

      try {
        // Convert current song to DB format
        const measures = [];
        measures.push(this.currentSong.title);
        this.currentSong.measures.forEach(m => {
          if (m.chords.length === 0) return;
          const realChords = m.chords.filter(c => c !== '%');
          const beatsPerChord = 4 / realChords.length;


          realChords.forEach(chord => {
            measures.push({ chord, beats: beatsPerChord });
          });
        });

        const result = await Database.aiReharmonize(measures);

        // Rebuild grid from AI response
        this.reconstructGridFromMeasures(result.measures);
        this.render();
        document.getElementById('ai-spinner').classList.add('hidden');
        YouJazz.showMessage("AI Reharmonization ✨", "New version generated!");
      } catch (e) {
        console.error('AI error:', e);
        YouJazz.showMessage("Error", "AI reharmonization failed. Try again.");
      }
    };
  }

  async initSession() {
    try {
      const response = await fetch('/api/init-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Unable to initialize session');
      }

      console.log('✅ Session initialized');
    } catch (err) {
      console.error('❌ Session initialization  error:', err);
      YouJazz.showMessage("Connection Error", "Unable to connect to server");
    }
  }

  _updateDropdown(searchTerm) {
    const dropdown = document.getElementById('song-list-dropdown');
    if (!dropdown || !this._allSongs) return;

    const search = searchTerm.toLowerCase().trim();

    // Filtra brani
    const filtered = search
      ? this._allSongs.filter(song => song.searchText.includes(search))
      : this._allSongs;

    // Popola dropdown
    dropdown.innerHTML = '';

    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="song-dropdown-item" style="color:#888;cursor:default;">No songs found</div>';
      return;
    }

    filtered.forEach(song => {
      const item = document.createElement('div');
      item.className = 'song-dropdown-item';
      item.textContent = song.displayText;
      item.dataset.songId = song.id;

      item.onclick = () => {
        this._loadSongById(song.id, song.displayText);
        dropdown.classList.add('hidden');
      };

      dropdown.appendChild(item);
    });
  }

  async _loadSongById(id, displayText) {
    const input = document.getElementById('song-list-input');

    try {
      const res = await fetch(`/api/songs/${id}`, { credentials: 'include' });
      const db = await res.json();

      // ✅ Imposta valore input
      if (input) input.value = displayText;

      // Ricostruisci currentSong (codice esistente invariato)
      this.currentSong = {
        _id: db._id,
        title: db.title,
        style: db.style || 'swing',
        isPublic: db.isPublic !== false,
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

      document.getElementById('bpm-slider').value = db.bpm;
      document.getElementById('bpm-value').textContent = db.bpm;
      this.showCreatedBy(db);
      this.render();

      // Aggiorna fav button
      let currentUser = null;
      try {
        const userRes = await fetch('/auth/me', { credentials: 'include' });
        if (userRes.ok) currentUser = await userRes.json();
      } catch (e) { }

      this.updateFavButton(db, currentUser);

    } catch (e) {
      console.error(e);
      YouJazz.showMessage("Errore", "Impossibile caricare il brano");
      if (input) input.value = '';
    }
  }


  reconstructGridFromMeasures(dbMeasures) {
    // Reset grid
    this.currentSong.measures = Array(this.currentSong.grid.rows * this.currentSong.grid.cols)
      .fill(null)
      .map(() => ({ chords: [] }));

    let currentMeasure = { chords: [] };
    let currentBeats = 0;
    let measureIndex = 0;

    dbMeasures.forEach(m => {
      if (currentBeats + m.beats > 4) {
        // Save current and start new
        if (currentMeasure.chords.length > 0 && measureIndex < this.currentSong.measures.length) {
          this.currentSong.measures[measureIndex] = currentMeasure;
          measureIndex++;
        }
        currentMeasure = { chords: [] };
        currentBeats = 0;
      }

      currentMeasure.chords.push(m.chord);
      currentBeats += m.beats;

      if (currentBeats === 4) {
        if (measureIndex < this.currentSong.measures.length) {
          this.currentSong.measures[measureIndex] = currentMeasure;
          measureIndex++;
        }
        currentMeasure = { chords: [] };
        currentBeats = 0;
      }
    });

    // Save last measure if not empty
    if (currentMeasure.chords.length > 0 && measureIndex < this.currentSong.measures.length) {
      this.currentSong.measures[measureIndex] = currentMeasure;
    }
  }

  async loadSongsList() {
    try {
      const songs = await Database.getSongs();
      const publicSongsCount = songs.filter(song => song.isPublic === true).length;

      // ORDINA I BRANI IN ORDINE ALFABETICO PER TITOLO (case-insensitive)
      songs.sort((a, b) => {
        const titleA = (a.title || '').trim().toLowerCase();
        const titleB = (b.title || '').trim().toLowerCase();
        return titleA.localeCompare(titleB);
      });
      const input = document.getElementById('song-list-input');
      const dropdown = document.getElementById('song-list-dropdown');

      if (!input || !dropdown) return;

      // Pulizia dropdown
      dropdown.innerHTML = '';
      dropdown.classList.add('hidden');

      // Utente loggato (una sola volta)
      let currentUser = null;
      if (!this.isGuest()) {
        try {
          const res = await fetch('/auth/me', { credentials: 'include' });
          if (res.ok) currentUser = await res.json();
        } catch (e) { }
      }

      const showOnlyFavourites = this.FavFilterSearch;
      const visibleSongs = songs.filter(song => {
        // Privacy filter (existing)
        const passesPrivacy = song.isPublic || (currentUser && song.owner._id === currentUser.id);
        if (!passesPrivacy) return false;

        // Favourites filter (new)
        if (showOnlyFavourites && currentUser) {
          return song.favourites?.includes(currentUser.id);
        }

        return true;
      });


      // ✅ Salva lista brani per filtro
      this._allSongs = visibleSongs.map(song => {
        const isFavourite = currentUser && song.favourites?.includes(currentUser.id);
        const favIcon = isFavourite ? '⭐ ' : '';
        const privacyIcon = !song.isPublic ? '' : '🌏 ';

        return {
          id: song._id,
          displayText: `${privacyIcon}${song.title} (${this.getOwnerName(song)})${favIcon}`,
          searchText: song.title.toLowerCase()
        };
      });

      input.placeholder = `🔍 Search among ${publicSongsCount} public songs...`;

      // ✅ Popola dropdown iniziale (tutti i brani)
      this._updateDropdown('');

      // ✅ GESTIONE INPUT + FILTRO CUSTOM
      input.onfocus = () => {
        input.value = ''; // ← CANCELLA IL CONTENUTO AL FOCUS
        this._updateDropdown(''); // ← MOSTRA TUTTI I BRANI
        dropdown.classList.remove('hidden');
      };
      input.oninput = () => {
        this._updateDropdown(input.value);
        dropdown.classList.remove('hidden');
      };

      // ✅ Chiudi dropdown cliccando fuori
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.select-wrapper')) {
          dropdown.classList.add('hidden');
        }
      });


    } catch (e) {
      console.error('Error loading songs:', e);
    }
  }
}

const app = new GypsyApp();

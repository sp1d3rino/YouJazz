const CHORDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const CHORD_EXTENSIONS = ['#', '♭', 'ø', 'o', '6', '7', '9', 'm', 'maj7'];

class GypsyApp {
  constructor() {
    this.player = new GypsyPlayer();
    this.currentSong = null;
    this.isPlaying = false;
    this.currentChordIndex = 0;
    this.highlightTimeout = null;

    // AVVIO IMMEDIATO – NON SERVE PIÙ init() dopo New Song
    this.loadChordsPalette();
    this.render();                    // mostra griglia vuota o messaggio
    this.loadSongsList();             // carica subito la dropdown
    this.setupGlobalEvents();
    this.setupEvents();               // eventi sempre attivi (BPM, Play, Stop, ecc.)
    this.setupCopyPaste();

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
      alert('Guest mode: You cannot create new songs. Login to create lead sheets.');
      return;
    }
    const modal = document.getElementById('grid-setup-modal');
    modal.classList.remove('hidden');

    const createBtn = document.getElementById('create-grid');
    const handler = () => {
      const rows = parseInt(document.getElementById('grid-rows').value) || 4;
      const cols = parseInt(document.getElementById('grid-cols').value) || 4;

      this.currentSong = {
        title: 'Song name',
        bpm: 120,
        grid: { rows, cols },
        measures: Array(rows * cols).fill(null).map(() => ({ chords: [] }))
      };

      modal.classList.add('hidden');
      createBtn.removeEventListener('click', handler);
       
      this.render();
    };

    createBtn.onclick = handler;
  }

  setupGlobalEvents() {
    document.getElementById('new-song').onclick = () => {
      if (this.currentSong && !confirm('Start a new lead sheet? Current changes will be lost.')) return;
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
        alert('Guest mode: You cannot clear songs.');
        return;
      }
    };

    document.getElementById('clear-all').onclick = () => {
      if (!this.currentSong) return;
      if (confirm('Clear all chords?')) {
        this.currentSong.measures.forEach(m => m.chords = []);
        this.render();
      }
    };

    document.getElementById('play').onclick = () => this.play();
    document.getElementById('stop').onclick = () => this.stopPlayback();
    document.getElementById('save-song').onclick = () => {
      if (this.isGuest()) {
        alert('Guest mode: You cannot save songs. Login to save.');
        return;
      }
      this.saveSong();
    };

    document.getElementById('delete-song').onclick = () => {
      if (this.isGuest()) {
        alert('Guest mode: You cannot delete songs.');
        return;
      }
      this.deleteCurrentSong();
    };
  }




  loadChordsPalette() {
    const chordList = document.querySelector('.chord-list');
    const extList = document.querySelector('.extension-list');
    chordList.innerHTML = '';
    extList.innerHTML = '';

    // Regular chords
    CHORDS.forEach(ch => {
      const btn = document.createElement('div');
      btn.className = 'chord-btn';
      btn.textContent = ch;
      btn.draggable = true;
      btn.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', ch);
        e.dataTransfer.setData('type', 'chord');
      });
      chordList.appendChild(btn);
    });

    // Extensions
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
      sheet.innerHTML = '<p style="text-align:center;color:#888;margin-top:100px;font-size:1.4em;">Create a new song or load one from the list</p>';
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

        // Only allow full chords (from root notes A–G) to be dropped on empty space
        if (type === 'chord' && droppedText) {
          m.chords.push(droppedText);
          this.preloadIfNeeded(droppedText);
          this.render();
        }
        // Extensions are completely ignored here → cannot create chord from extension alone
      };
      measure.ondragover = e => e.preventDefault();

      m.chords.forEach((chord, i) => {
        const box = document.createElement('div');
        box.className = 'chord-box';
        box.textContent = chord;
        box.draggable = true;

        // Drag start – move or copy the full chord
        box.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/plain', chord);
          e.dataTransfer.setData('type', 'chord');
          // Remove after drag starts (so it moves)
          setTimeout(() => { m.chords.splice(i, 1); this.render(); }, 0);
        });

        // Allow dropping extensions onto this chord
        box.ondragover = e => e.preventDefault();

        box.ondrop = e => {
          e.preventDefault();
          e.stopPropagation();

          const droppedText = e.dataTransfer.getData('text/plain');
          const type = e.dataTransfer.getData('type');

          // BLOCK: Never allow a full chord (A, B, C...) to replace an existing chord
          if (type === 'chord') {
            return; // silently ignore
          }

          // ALLOW only extensions
          if (type !== 'extension') return;

          // === EXTENSION LOGIC (unchanged, but now safe) ===
          let root = '';
          const rootMatch = chord.match(/^([A-G][#♭]?)/i);
          if (rootMatch) root = rootMatch[0];
          const rest = chord.slice(root ? root.length : 1);

          let newChord = chord;

          if (['#', '♭', 'ø', 'o'].includes(droppedText)) {
            const rootLetter = chord[0];
            newChord = rootLetter + droppedText;
            if (droppedText === 'ø') newChord += '7';
            if (droppedText === 'o') newChord += '7';
            if (rest && !['#', '♭', 'ø', 'o'].includes(rest[0])) {
              newChord += rest;
            }
          }

          else if (droppedText === 'm') {
            newChord = chord.replace(/(maj|m)?[0-9]*$/g, '') + 'm';
          }

          else if (['maj7', 'm'].includes(droppedText)) {
            newChord = chord.replace(/(maj|m)?[0-9]*$/g, '') + droppedText;
          }

          else if (['6', '7', '9'].includes(droppedText)) {
            newChord = chord.replace(/[0-9]+$/, '') + droppedText;
          }

          m.chords[i] = newChord;
          this.preloadIfNeeded(newChord);
          this.render();
        };

        const x = document.createElement('span');
        x.className = 'remove';
        x.textContent = '×';
        x.onclick = e => {
          e.stopPropagation();
          m.chords.splice(i, 1);
          this.render();
        };
        box.appendChild(x);

        measure.appendChild(box);
      });

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

  async play() {
    if (this.isPlaying || !this.currentSong) return;

    this.isPlaying = true;
    this.updateUIControls();
    this.currentChordIndex = 0;
    this.clearHighlight();

    const seq = [], beatCounts = [];
    for (const m of this.currentSong.measures) {
      if (m.chords.length === 0) continue;
      const beatsPerChord = 4 / m.chords.length;
      m.chords.forEach(ch => {
        seq.push(ch);
        beatCounts.push(beatsPerChord);
      });
    }

    if (seq.length === 0) {
      alert('No chords to play!');
      this.isPlaying = false;
      return;
    }

    document.getElementById('audio-spinner').classList.remove('hidden');
    for (const ch of seq) if (!this.player.buffers.has(ch)) await this.player.load(ch);
    document.getElementById('audio-spinner').classList.add('hidden');

    const beatMs = 60000 / this.currentSong.bpm;

    this.player.playVariableSequence(
      seq,
      beatCounts.map(b => b * (60 / this.currentSong.bpm)),
      this.currentSong.bpm
    );

    const highlightNext = () => {
      this.clearHighlight();
      if (this.currentChordIndex < seq.length) {
        const current = seq[this.currentChordIndex];
        document.querySelectorAll('.chord-box').forEach(box => {
          if (box.textContent.trim() === current) {
            box.classList.add('playing');
          }
        });
        this.currentChordIndex++;
        this.highlightTimeout = setTimeout(highlightNext, beatMs);
      } else {
        this.isPlaying = false;
      }
    };
    highlightNext();
  }

  stopPlayback() {
    this.player.stop();
    if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
    this.clearHighlight();
    this.isPlaying = false;
    this.updateUIControls();
    this.currentChordIndex = 0;
  }

  clearHighlight() {
    document.querySelectorAll('.chord-box.playing').forEach(b => b.classList.remove('playing'));
  }

  async preloadIfNeeded(chord) {
    if (!this.player.buffers.has(chord)) await this.player.load(chord);
  }

  async saveSong() {
    if (!this.currentSong) {
      return alert('Nessun brano da salvare');
    }

    const title = document.getElementById('song-title').value.trim() || 'Untitled';
    this.currentSong.title = title;

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
          alert('This song is not yours. You cannot modify it!');
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

      alert(`${title}, Saved!`);
      await this.loadSongsList();

    } catch (e) {
      console.error('Saving error:', e);
      alert('Unable to save the song. Did you log in?');
    }
  }

  async deleteCurrentSong() {
    if (!this.currentSong?._id) return alert('No song loaded.');
    if (!confirm(`Permanently delete "${this.currentSong.title}"?`)) return;

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
          alert('This song is not yours. You cannot delete it!');
          await this.loadSongsList();  // ricarica la lista per sicurezza
          return;
        }
      }


      await Database.deleteSong(this.currentSong._id);
      this.currentSong = null;
      this.render();
      alert('Song deleted');
      await this.loadSongsList();
    } catch (e) {
      console.error('Errore salvataggio:', e);
      alert('Impossibile salvare il brano. Sei sicuro di essere loggato?');
    }
  }

  async loadSongsList() {
    try {
      const songs = await Database.getSongs();
      const sel = document.getElementById('song-list');
      sel.innerHTML = '<option value="">– Load Song –</option>';
      songs.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s._id;
        const ownerName = this.getOwnerName(s);  // ← Aggiungi questo
        opt.textContent = `${s.title} (${ownerName})`;  // ← Modifica: titolo + (owner)
        sel.appendChild(opt);
      });

      sel.onchange = async () => {
        const id = sel.value;
        if (!id) return;
        const res = await fetch(`/api/songs/${id}`);
        const db = await res.json();

        this.currentSong = {
          _id: db._id,
          title: db.title,
          bpm: db.bpm || 200,
          grid: db.grid || { rows: 4, cols: 4 },
          measures: []
        };

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

        // ← Aggiungi: mostra "Created by"
        this.showCreatedBy(db);

        this.render();
      };
    } catch (e) {
      console.error('Error loading songs:', e);
    }
  }
}

const app = new GypsyApp();
app.render();                    // mostra il messaggio iniziale
app.loadSongsList();             // popola la dropdown subito
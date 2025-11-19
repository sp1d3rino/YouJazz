const CHORDS = ['Gm', 'Gm6', 'Cm', 'Cm6', 'D7', 'Eb7', 'E7', 'Am6', 'Dm6', 'F7'];

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
  }

  showNewGridModal() {
    const modal = document.getElementById('grid-setup-modal');
    modal.classList.remove('hidden');

    const createBtn = document.getElementById('create-grid');
    const handler = () => {
      const rows = parseInt(document.getElementById('grid-rows').value) || 4;
      const cols = parseInt(document.getElementById('grid-cols').value) || 8;

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
      if (!this.currentSong) return;
      if (confirm('Clear all chords?')) {
        this.currentSong.measures.forEach(m => m.chords = []);
        this.render();
      }
    };

    document.getElementById('play').onclick = () => this.play();
    document.getElementById('stop').onclick = () => this.stopPlayback();
    document.getElementById('save-song').onclick = () => this.saveSong();
    document.getElementById('delete-song').onclick = () => this.deleteCurrentSong();
  }

  loadChordsPalette() {
    const list = document.querySelector('.chord-list');
    list.innerHTML = '';
    CHORDS.forEach(ch => {
      const btn = document.createElement('div');
      btn.className = 'chord-btn';
      btn.textContent = ch;
      btn.draggable = true;
      btn.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', ch));
      list.appendChild(btn);
    });
  }

  render() {
    const sheet = document.getElementById('lead-sheet');

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
        const chord = e.dataTransfer.getData('text/plain');
        if (chord) {
          m.chords.push(chord);
          this.preloadIfNeeded(chord);
          this.render();
        }
      };
      measure.ondragover = e => e.preventDefault();

      m.chords.forEach((chord, i) => {
        const box = document.createElement('div');
        box.className = 'chord-box';
        box.textContent = chord;
        box.draggable = true;

        box.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/plain', chord);
          setTimeout(() => { m.chords.splice(i, 1); this.render(); }, 0);
        });

        const x = document.createElement('span');
        x.className = 'remove';
        x.textContent = '×';
        x.onclick = e => { e.stopPropagation(); m.chords.splice(i, 1); this.render(); };
        box.appendChild(x);

        measure.appendChild(box);
      });

      sheet.appendChild(measure);
    });
  }

  async play() {
    if (this.isPlaying || !this.currentSong) return;

    this.isPlaying = true;
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
    this.currentChordIndex = 0;
  }

  clearHighlight() {
    document.querySelectorAll('.chord-box.playing').forEach(b => b.classList.remove('playing'));
  }

  async preloadIfNeeded(chord) {
    if (!this.player.buffers.has(chord)) await this.player.load(chord);
  }

  async saveSong() {
    if (!this.currentSong) return alert('No song to save');
    const title = document.getElementById('song-title').value.trim() || 'Untitled';
    this.currentSong.title = title;

    try {
      const saved = await Database.saveSong(this.currentSong);
      this.currentSong._id = saved._id;
      alert(`Saved: ${title}`);
      await this.loadSongsList();
    } catch (e) {
      alert('Save failed');
    }
  }

  async deleteCurrentSong() {
    if (!this.currentSong?._id) return alert('No song loaded.');
    if (!confirm(`Permanently delete "${this.currentSong.title}"?`)) return;

    await Database.deleteSong(this.currentSong._id);
    this.currentSong = null;
    this.render();
    alert('Song deleted');
    await this.loadSongsList();
  }

  async loadSongsList() {
    try {
      const songs = await Database.getSongs();
      const sel = document.getElementById('song-list');
      sel.innerHTML = '<option value="">– Load Song –</option>';
      songs.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s._id;
        opt.textContent = s.title;
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
          grid: db.grid || { rows: 4, cols: 8 },
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
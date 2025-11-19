const CHORDS = ['Gm', 'Gm6', 'Cm', 'Cm6', 'D7', 'Eb7', 'E7', 'Am6', 'Dm6', 'C#°'];

class GypsyApp {
  constructor() {
    this.player = new GypsyPlayer();
    this.currentSong = null;
    this.isPlaying = false;

    this.showNewGridModal(); // Modal all'avvio
    this.setupGlobalEvents();
  }

  showNewGridModal() {
    const modal = document.getElementById('grid-setup-modal');
    modal.style.display = 'flex';

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

      modal.style.display = 'none';
      createBtn.removeEventListener('click', handler); // evita doppi listener
      this.init();
    };

    createBtn.onclick = handler;
  }

  setupGlobalEvents() {
    document.getElementById('new-song').onclick = () => {
      if (this.currentSong && !confirm('Start a new lead sheet? Current changes will be lost.')) return;
      this.showNewGridModal();
    };
  }

  async init() {
    this.loadChordsPalette();
    this.render();
    this.setupEvents();
    await this.loadSongsList();
  }

  setupEvents() {
    document.getElementById('bpm-slider').oninput = e => {
      document.getElementById('bpm-value').textContent = e.target.value;
      this.currentSong.bpm = +e.target.value;
    };

    // CORRETTO: era "clear", ora è "clear-all"
    document.getElementById('clear-all').onclick = () => {
      if (confirm('Clear all chords?')) {
        this.currentSong.measures = this.currentSong.measures.map(() => ({ chords: [] }));
        this.render();
      }
    };

    document.getElementById('play').onclick = () => this.play();
    document.getElementById('stop').onclick = () => this.player.stop();
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
    if (this.isPlaying) this.player.stop();
    const seq = [], dur = [];
    for (const m of this.currentSong.measures) {
      if (m.chords.length === 0) continue;
      const beats = 4 / m.chords.length;
      m.chords.forEach(ch => {
        seq.push(ch);
        dur.push((60 / this.currentSong.bpm) * beats);
      });
    }
    if (seq.length === 0) return alert('No chords to play!');
    await this.player.playVariableSequence(seq, dur, this.currentSong.bpm);
    this.isPlaying = true;
  }

  async preloadIfNeeded(chord) {
    if (!this.player.buffers.has(chord)) await this.player.load(chord);
  }

  async saveSong() {
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
    alert('Song deleted');
    this.showNewGridModal();
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
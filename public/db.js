class Database {
  static async getSongs() {
    const res = await fetch('/api/songs');
    if (!res.ok) throw new Error('Errore caricamento brani');
    return await res.json();
  }

  static async saveSong(song) {
    // Convertiamo il nostro formato interno in quello del DB
    const dbSong = {
      title: song.title,
      style: song.style,
      bpm: song.bpm,
      measures: []
    };

    // Ogni "measure" nel frontend ha un array di accordi → li trasformiamo in misure singole
    song.measures.forEach(measure => {
      if (measure.chords.length === 0) {
        // Battuta vuota → non salviamo nulla (o possiamo salvare una pausa)
        return;
      }

      const realChords = measure.chords.filter(c => c !== '%');
      if (realChords.length === 0) return;

      const beatsPerChord = 4 / realChords.length;

      realChords.forEach(chord => {
        dbSong.measures.push({
          chord: chord,
          beats: beatsPerChord // 1, 2, 4 (solo questi valori possibili)
        });
      });
    });

    if (song._id) {
      dbSong._id = song._id;
      const res = await fetch(`/api/songs/${song._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbSong)
      });
      return await res.json();
    } else {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbSong)
      });
      return await res.json();
    }
  }

  static async deleteSong(id) {
    await fetch(`/api/songs/${id}`, { method: 'DELETE' });
  }
}
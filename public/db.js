class Database {
  static async getSongs() {
    const res = await fetch('/api/songs');
    if (!res.ok) throw new Error('Load songs error');
    return await res.json();
  }

  static async updatePublicStatus(songId, isPublic) {
    console.log('Updating public status for song', songId, 'to', isPublic);
    const res = await fetch(`/api/songs/${songId}/public`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isPublic })
    });


    if (!res.ok) throw new Error('Failed to update');
    return await res.json();
  }

  static async toggleFavourite(songId) {
    const res = await fetch(`/api/songs/${songId}/favourite`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Errore toggle favourite');
    return await res.json();
  }


  static async saveSong(song) {
    // Convertiamo il nostro formato interno in quello del DB
    const dbSong = {
      title: song.title,
      style: song.style,
      grid: song.grid,
      isPublic: song.isPublic,
      introMeasuresCount: song.introMeasuresCount,
      outroMeasuresCount: song.outroMeasuresCount,
      loops: song.loops,
      bpm: song.bpm,
      introMeasuresCount: song.introMeasuresCount || 0,   
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

  static async saveAs(song) {
    const res = await fetch('/api/songs/save-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(song)
    });
    if (!res.ok) throw new Error('Errore save-as');
    return await res.json();
  }

  static async deleteSong(id) {
    await fetch(`/api/songs/${id}`, { method: 'DELETE' });
  }

  // === INCREMENTA PLAYCOUNT (invisibile all'utente) ===
static async incrementPlayCount(songId) {
  try {
    fetch(`/api/songs/${songId || 'guest'}/play`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.warn('playCount non aggiornato (offline o errore server)');
  }
}

  static async aiReharmonize(measures) {
    const res = await fetch('/api/songs/ai-reharmonize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ measures })
    });
    if (!res.ok) throw new Error('AI reharmonization failed');
    return await res.json();
  }

}
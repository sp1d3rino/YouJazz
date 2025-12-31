class GypsyPlayer {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.buffers = new Map();
    this.processedBuffers = new Map();
    this.isPlaying = false;
    this.scheduledSources = [];
    this.timerId = null;
    this.lookahead = 0.1;
    this.scheduleInterval = 25;
    this.nextStartTime = 0;
    this.isPaused = false;
    this.pausedSeqIndex = 0;
  }

  async load(chord, style) {
    //if (this.buffers.has(chord)) return this.buffers.get(chord);
    // === FIX AUTOMATICO per accordi "impossibili" (B#, E#, Cb, Fb) ===
    const fixMap = {
      'B#': 'C', 'B#maj7': 'Cmaj7', 'B#7': 'C7', 'B#m7': 'Cm7',
      'E#': 'F', 'E#maj7': 'Fmaj7', 'E#7': 'F7', 'E#m7': 'Fm7',
      'C♭': 'B', 'C♭maj7': 'Bmaj7',
      'F♭': 'E', 'F♭maj7': 'Emaj7'
    };



    let finalChord = fixMap[chord] || chord;  // se esiste, corregge automaticamente

    // === TUA LOGICA ESISTENTE per ♭ → #, ø, o, ecc. (la lasciamo intatta) ===
    let filenameChord = finalChord;

    const flatToSharp = { 'C♭': 'B', 'D♭': 'C#', 'E♭': 'D#', 'F♭': 'E', 'G♭': 'F#', 'A♭': 'G#', 'B♭': 'A#' };
    let rootFlat = null;
    let rest = finalChord;
    for (const flat of Object.keys(flatToSharp)) {
      if (finalChord.startsWith(flat)) {
        rootFlat = flat;
        rest = finalChord.slice(flat.length);
        break;
      }
    }
    if (rootFlat) filenameChord = flatToSharp[rootFlat] + rest;

    filenameChord = filenameChord
      .replace(/ø7/g, 'half').replace(/ø/g, 'half')
      .replace(/o7/g, 'dim').replace(/o/g, 'dim')
      .replace(/♭/g, 'b')
      .replace(/\s+/g, '');

    const safeChord = encodeURIComponent(filenameChord);

    try {
      const res = await fetch(`audio/chords/${style}/${safeChord}.mp3`);
      if (!res.ok) throw new Error();

      const arrayBuffer = await res.arrayBuffer();
      const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.buffers.set(chord, buffer);  // salva con nome originale per il display
      return buffer;

    } catch (err) {
      // ACCORDO NON ESISTE → lo rimuoviamo automaticamente
      console.warn(`Audio non trovato: "${chord}" → rimosso dalla griglia`);

      // Lanciamo un errore speciale che app.js capirà
      const removeErr = new Error('REMOVE_CHORD');
      removeErr.chordToRemove = chord;
      throw removeErr;
    }
  }
  async getStretchedBuffer(chord, bpm, style) {
    const cacheKey = `${chord}_${bpm}`;
    /*    disabled because it caused issues with updated audio files
    if (this.processedBuffers.has(cacheKey)) {
          return this.processedBuffers.get(cacheKey);
        }
    */
    const originalBuffer = await this.load(chord, style);

    // Calcola durata target: 4 battiti alla nuova velocità
    const targetDuration = (60 / bpm) * 4; // 4 beats in secondi
    const originalDuration = originalBuffer.duration;
    const playbackRate = originalDuration / targetDuration;

    // ✅ Usa Tone.Offline per time-stretching senza pitch shift
    const stretchedBuffer = await Tone.Offline(async () => {
      const player = new Tone.Player({
        url: originalBuffer,
        playbackRate: 1 // ← mantieni pitch originale
      }).toDestination();

      // ✅ Usa Tone.GrainPlayer per time-stretching puro
      const grainPlayer = new Tone.GrainPlayer({
        url: originalBuffer,
        playbackRate: playbackRate, // ← controlla velocità
        grainSize: 0.12,              // dimensione grani (100ms)
        overlap: 0.11,               // overlap tra grani
        loop: false
      }).toDestination();

      grainPlayer.start(0);

    }, targetDuration); // ← durata esatta del rendering

    const finalBuffer = stretchedBuffer.get();
    this.processedBuffers.set(cacheKey, finalBuffer);
    return finalBuffer;
  }

  // ←←← UNICO METODO USATO DALL'APP ←←←
  // ←←← METODO AGGIORNATO CON COUNT-IN INTEGRATO ←←←
  async playVariableSequence(chords, style, beatDurations, bpm, onChordCallback = null, onEndCallback = null, enableCountIn = true, introMeasuresCount = 0, outroMeasuresCount = 0, maxLoops = 0) {
    if (this.isPlaying) this.stop();
    this.isPlaying = true;
    this.bpm = bpm;

    await Promise.all(chords.map(ch => this.getStretchedBuffer(ch, bpm, style)));

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.nextStartTime = this.audioContext.currentTime + 0.05;

    let seqIndex = 0;           // ← indice solo per la sequenza (loopa da 0)
    let countInCount = 0;       // ← contatore separato per i 4 tick
    let hasLooped = false;
    let currentLoop = 0;

    let introChordsCount = 0;
    let introPlayed = false;

    // Calcola quanti accordi ci sono nell'intro
    if (introMeasuresCount > 0) {
      let measuresProcessed = 0;
      for (let i = 0; i < chords.length && measuresProcessed < introMeasuresCount; i++) {
        // Ogni accordo potrebbe occupare 1, 2 o 4 battiti (1/4, 1/2, o intera misura)
        const beats = beatDurations[i] / (60 / bpm);
        if (beats >= 3.9) measuresProcessed++; // misura intera
        else if (beats >= 1.9) measuresProcessed += 0.5; // mezza misura
        else measuresProcessed += 0.25; // quarto
        introChordsCount++;
      }
    }

    let outroChordsCount = 0;
    if (outroMeasuresCount > 0) {
      let measuresProcessed = 0;
      for (let i = chords.length - 1; i >= 0 && measuresProcessed < outroMeasuresCount; i--) {
        const beats = beatDurations[i] / (60 / bpm);
        if (beats >= 3.9) measuresProcessed++;
        else if (beats >= 1.9) measuresProcessed += 0.5;
        else measuresProcessed += 0.25;
        outroChordsCount++;
      }
    }
    const loopEndIndex = chords.length - outroChordsCount;
    const quarter = 60 / bpm;

    const schedule = () => {
      if (!this.isPlaying) return;

      while (this.nextStartTime < this.audioContext.currentTime + this.lookahead) {

        // 1. COUNT-IN (solo primi 4 beat)
        if (enableCountIn && countInCount < 4) {
          const osc = this.audioContext.createOscillator();
          const gain = this.audioContext.createGain();
          osc.connect(gain);
          gain.connect(this.audioContext.destination);

          osc.frequency.setValueAtTime(900, this.nextStartTime);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, this.nextStartTime);
          gain.gain.linearRampToValueAtTime(0.4, this.nextStartTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, this.nextStartTime + 0.1);

          osc.start(this.nextStartTime);
          osc.stop(this.nextStartTime + 0.1);

          countInCount++;
          this.nextStartTime += quarter;
          continue; // salta il resto del ciclo
        }

        // 2. LOOP NORMALE DEGLI ACCORDI
        if (seqIndex >= loopEndIndex && outroChordsCount > 0 && !hasLooped) {
          // ✅ Verifica se dobbiamo continuare a loopare o passare all'outro

          // âœ… Verifica se dobbiamo continuare a loopare o passare all'outro
          currentLoop++;

          // âœ… AGGIUNGI: Notifica cambio loop all'app
          if (window.app) {
            window.app.currentLoop = currentLoop + 1;
            window.app._updateLoopDisplay();
          }

          if (maxLoops > 0 && currentLoop >= maxLoops) {
            // Loops finiti â†' passa all'outro
            seqIndex = loopEndIndex;
            hasLooped = true;
          } else {
            // Continua loop
            if (introMeasuresCount > 0 && introChordsCount > 0) {
              seqIndex = introChordsCount; // Salta intro
            } else {
              seqIndex = 0;
            }

          }
        } else if (seqIndex >= chords.length) {
          if (outroChordsCount > 0) {
            // Fine outro → stop definitivo
            this.stop();
            if (onEndCallback) {

              onEndCallback();
            }
            return;
          }

          // ✅ Gestione loop senza outro
          currentLoop++;

          // âœ… AGGIUNGI: Notifica cambio loop all'app
          if (window.app) {
            window.app.currentLoop = currentLoop + 1;
            window.app._updateLoopDisplay();
          }

          if (maxLoops > 0 && currentLoop >= maxLoops) {

            // Loops finiti â†' stop
            this.stop();
            if (onEndCallback) {

              onEndCallback();
            }
            return;
          }

          // Continua loop infinito
          if (introMeasuresCount > 0 && introChordsCount > 0) {
            seqIndex = introChordsCount;
          } else {
            seqIndex = 0;
          }

        }

        const chord = chords[seqIndex];
        const duration = beatDurations[seqIndex] ?? quarter;

        const buffer = this.processedBuffers.get(`${chord}_${bpm}`);
        if (buffer) {
          const source = this.audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioContext.destination);
          source.start(this.nextStartTime);
          source.stop(this.nextStartTime + duration);
          this.scheduledSources.push(source);

          if (onChordCallback) {
            onChordCallback(seqIndex, chord);
          }
        }

        this.nextStartTime += duration;
        seqIndex++; // ← solo questo avanza!
      }

      // Chiamata fine giro (opzionale)
      if (hasLooped && seqIndex === 0 && onEndCallback) {
        console.log("Chiamata fine loop");
        onEndCallback();
        hasLooped = false;
      }
    };

    schedule();
    this._currentScheduleFunction = schedule;
    this.timerId = setInterval(schedule, this.scheduleInterval);
  }

  stop() {
    this.isPlaying = false;
      this.isPaused = false;   
  this.pausedSeqIndex = 0;  

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.scheduledSources.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    this.scheduledSources = [];

  }


  pause() {
    this.isPaused = true;

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    // Stoppa tutti i source schedulati ma salva l'indice corrente
    this.scheduledSources.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    this.scheduledSources = [];

    console.log('⏸️ Player paused');
  }

  resume() {
    if (!this.isPaused) return;

    this.isPaused = false;
    this.nextStartTime = this.audioContext.currentTime + 0.05;

    // Riprendi lo scheduling dal punto in cui era stato interrotto
    const schedule = this._currentScheduleFunction;
    if (schedule) {
      schedule();
      this.timerId = setInterval(schedule, this.scheduleInterval);
    }

    console.log('▶️ Player resumed');
  }

}
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
  }

  async load(chord, style) {
    if (this.buffers.has(chord)) return this.buffers.get(chord);
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
      .replace(/b/g, '♭')
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
  async getStretchedBuffer(chord, bpm) {
    const cacheKey = `${chord}_${bpm}`;
    /*if (this.processedBuffers.has(cacheKey)) {
      return this.processedBuffers.get(cacheKey);
    }*/

    const originalBuffer = await this.load(chord);
    const tempoRatio = bpm / 120;

    const kali = new Kali(originalBuffer.numberOfChannels);
    kali.setup(originalBuffer.sampleRate, tempoRatio, false);

    // Forza parametri ottimali per qualità
    kali.fftSize = 4096;
    kali.hopSize = kali.fftSize / 8;  // overlap 8x invece di 4x

    let inputData;
    if (originalBuffer.numberOfChannels === 2) {
      const left = originalBuffer.getChannelData(0);
      const right = originalBuffer.getChannelData(1);
      inputData = new Float32Array(left.length * 2);
      for (let i = 0; i < left.length; i++) {
        inputData[i * 2] = left[i];
        inputData[i * 2 + 1] = right[i];
      }
    } else {
      inputData = originalBuffer.getChannelData(0);
    }

    kali.input(inputData);
    kali.process();

    const expectedSamples = Math.ceil(inputData.length / tempoRatio);
    let output = new Float32Array(expectedSamples + 16384);
    let totalSamples = 0;
    let read;
    do {
      read = kali.output(output.subarray(totalSamples));
      totalSamples += read;
    } while (read > 0);

    kali.flush();
    read = kali.output(output.subarray(totalSamples));
    totalSamples += read;

    const finalOutput = output.subarray(0, totalSamples);

    const stretchedBuffer = this.audioContext.createBuffer(
      originalBuffer.numberOfChannels,
      Math.floor(finalOutput.length / originalBuffer.numberOfChannels),
      originalBuffer.sampleRate
    );

    if (originalBuffer.numberOfChannels === 2) {
      const left = new Float32Array(stretchedBuffer.length);
      const right = new Float32Array(stretchedBuffer.length);
      for (let i = 0; i < stretchedBuffer.length; i++) {
        left[i] = finalOutput[i * 2];
        right[i] = finalOutput[i * 2 + 1];
      }
      stretchedBuffer.copyToChannel(left, 0);
      stretchedBuffer.copyToChannel(right, 1);
    } else {
      stretchedBuffer.copyToChannel(finalOutput, 0);
    }

    this.processedBuffers.set(cacheKey, stretchedBuffer);
    return stretchedBuffer;
  }

  // ←←← UNICO METODO USATO DALL'APP ←←←
  // ←←← METODO AGGIORNATO CON COUNT-IN INTEGRATO ←←←
  async playVariableSequence(chords, beatDurations, bpm, onChordCallback = null, onEndCallback = null, enableCountIn = true) {
    if (this.isPlaying) this.stop();

    this.isPlaying = true;
    this.bpm = bpm;

    await Promise.all(chords.map(ch => this.getStretchedBuffer(ch, bpm)));

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.nextStartTime = this.audioContext.currentTime + 0.05;

    let seqIndex = 0;           // ← indice solo per la sequenza (loopa da 0)
    let countInCount = 0;       // ← contatore separato per i 4 tick
    let hasLooped = false;

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
        if (seqIndex >= chords.length) {
          seqIndex = 0;
          hasLooped = true;
          if (onEndCallback) onEndCallback();
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
        onEndCallback();
        hasLooped = false;
      }
    };

    schedule();
    this.timerId = setInterval(schedule, this.scheduleInterval);
  }

  stop() {
    this.isPlaying = false;

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.scheduledSources.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    this.scheduledSources = [];
  }
}
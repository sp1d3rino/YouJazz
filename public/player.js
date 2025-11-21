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

async load(chord) {
  if (this.buffers.has(chord)) return this.buffers.get(chord);

  const flatToSharp = {
    'C♭': 'B',
    'D♭': 'C#',
    'E♭': 'D#',
    'F♭': 'E',
    'G♭': 'F#',
    'A♭': 'G#',
    'B♭': 'A#'
  };

  let filenameChord = chord;

  // 1. Converti ♭ → # enharmonico
  let rootFlat = null;
  let rest = chord;
  for (const flat of Object.keys(flatToSharp)) {
    if (chord.startsWith(flat)) {
      rootFlat = flat;
      rest = chord.slice(flat.length);
      break;
    }
  }
  if (rootFlat) {
    filenameChord = flatToSharp[rootFlat] + rest;
  }

  // 2. Gestisci ø e o (dopo la conversione ♭→#)
  filenameChord = filenameChord
    .replace(/ø7/g, 'half7')
    .replace(/ø/g, 'half')
    .replace(/o7/g, 'dim7')
    .replace(/o/g, 'dim');

  // 3. Pulizia finale
  filenameChord = filenameChord.replace(/\s+/g, '');

  // 4. USA SOLO encodeURIComponent() — NIENTE replace manuale del #
  const safeChord = encodeURIComponent(filenameChord);

  // Debug (puoi rimuoverlo dopo)
  console.log(`Loading chord: "${chord}" → "${safeChord}.mp3"`);

  const res = await fetch(`audio/chords/${safeChord}.mp3`);

  if (!res.ok) {
    throw new Error(`Audio not found: ${chord} → tried ${safeChord}.mp3`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = await this.audioContext.decodeAudioData(arrayBuffer);

  this.buffers.set(chord, buffer);
  return buffer;
}

  async getStretchedBuffer(chord, bpm) {
    const cacheKey = `${chord}_${bpm}`;
    if (this.processedBuffers.has(cacheKey)) {
      return this.processedBuffers.get(cacheKey);
    }

    const originalBuffer = await this.load(chord);
    const tempoRatio = bpm / 120;

    const kali = new Kali(originalBuffer.numberOfChannels);
    kali.setup(originalBuffer.sampleRate, tempoRatio, false);

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
  async playVariableSequence(chords, beatDurations, bpm) {
    if (this.isPlaying) this.stop();

    this.isPlaying = true;
    this.bpm = bpm;

    // Pre-carica tutto (come facevi tu)
    await Promise.all(chords.map(ch => this.getStretchedBuffer(ch, bpm)));

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.nextStartTime = this.audioContext.currentTime + 0.1;
    let currentIndex = 0;

    const scheduleNotes = () => {
      if (!this.isPlaying) return;

      while (this.nextStartTime < this.audioContext.currentTime + this.lookahead) {
        if (currentIndex >= chords.length) {
          currentIndex = 0;  // loop
        }

        const chord = chords[currentIndex];
        const duration = beatDurations[currentIndex];

        const buffer = this.processedBuffers.get(`${chord}_${bpm}`);
        if (buffer) {
          const source = this.audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioContext.destination);
          source.start(this.nextStartTime);
          source.stop(this.nextStartTime + duration);

          this.scheduledSources.push(source);
        }

        this.nextStartTime += duration;
        currentIndex++;
      }
    };

    // Usa esattamente il tuo sistema di scheduling (che non ha mai fallito)
    scheduleNotes();
    this.timerId = setInterval(scheduleNotes, this.scheduleInterval);
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
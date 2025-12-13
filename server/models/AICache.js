const mongoose = require('mongoose');

const AICacheSchema = new mongoose.Schema({
  songTitle: { type: String, required: true, unique: true, index: true },
  originalProgression: { type: String, required: true }, // "Cmaj7|4 Dm7|2 G7|2"
  reharmonizedMeasures: [{
    chord: String,
    beats: Number
  }],
  createdAt: { type: Date, default: Date.now, expires: 2592000 } // TTL 30 giorni
});

module.exports = mongoose.model('AICache', AICacheSchema);
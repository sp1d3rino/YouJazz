// models/Song.js
const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title: { type: String, required: true },
  bpm: { type: Number, default: 120 },
  style: { type: String, default: 'swing' },
  grid: {
    rows: { type: Number, default: 4 },
    cols: { type: Number, default: 4 }
  },
  measures: [{
    chord: String,
    beats: Number
  }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional
  isPublic: { type: Boolean, default: true } // NEW: default public
}, { timestamps: true });

module.exports = mongoose.model('Song', SongSchema);
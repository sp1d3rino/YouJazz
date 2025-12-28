// models/Song.js
const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title: { type: String, required: true },
  bpm: { type: Number, default: 120 },
  style: { type: String, default: 'swing' },
  playCount: { type: Number, default: 0 },
  grid: {
    rows: { type: Number, default: 4 },
    cols: { type: Number, default: 4 }
  },
  introMeasuresCount: { type: Number, default: 0 },
  outroMeasuresCount: { type: Number, default: 0 },
  loops: { type: Number, default: 0 },
  measures: [{
    chord: String,
    beats: Number
  }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional
  isPublic: { type: Boolean, default: true }, // NEW: default public
  likes: {  type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: []},
  favourites: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Song', SongSchema);
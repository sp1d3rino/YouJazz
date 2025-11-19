// models/Song.js
const mongoose = require('mongoose');

const MeasureSchema = new mongoose.Schema({
  chord: { type: String, default: null },
  beats: { type: Number, enum: [1, 2, 3, 4], default: 4 }
});

const SongSchema = new mongoose.Schema({
  title: { type: String, required: true },
  bpm: { type: Number, default: 120 },
  measures: [MeasureSchema],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', SongSchema);
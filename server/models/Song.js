const mongoose = require('mongoose');

const MeasureSchema = new mongoose.Schema({
  chord: { type: String, default: null },
  beats: { type: Number, enum: [1, 2, 3, 4], default: 4 } // 1/4, 2/4, 3/4, 4/4
});

const SongSchema = new mongoose.Schema({
  title: { type: String, required: true },
  bpm: { type: Number, default: 120 },
  measures: [MeasureSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', SongSchema);
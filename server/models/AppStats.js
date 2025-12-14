const mongoose = require('mongoose');

const appStatsSchema = new mongoose.Schema({
  totalPlays: { type: Number, default: 0 },
  // Usa un documento unico con _id fisso
  _id: { type: String, default: 'global' }
});

module.exports = mongoose.model('AppStats', appStatsSchema);
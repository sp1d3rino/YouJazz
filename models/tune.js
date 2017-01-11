// Load required packages
var mongoose = require('mongoose');


// Define our beer schema
var TuneSchema   = new mongoose.Schema({
  tuneTitle: String,
  tuneAuthorName: String,
  grilleAuthorName: String,
  comments: String,
  timestamp: { type: Date, default: Date.now },
  votes: Number,
  numRow:Number,
  numCol:Number,
  grille:[],
  userId: String
});

// Export the Mongoose model
module.exports = mongoose.model('Tune', TuneSchema);

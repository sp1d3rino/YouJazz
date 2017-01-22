// Load required packages
var mongoose = require('mongoose');

var UserVote = new mongoose.Schema({username:String, vote: Number});


// Define our beer schema
var TuneVoteSchema   = new mongoose.Schema({
  tuneId: String,
  votelist: [UserVote]
});

// Export the Mongoose model
module.exports = mongoose.model('TuneVote', TuneVoteSchema);

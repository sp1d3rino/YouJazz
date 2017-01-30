// Load required packages
var mongoose = require('mongoose');

// Define our beer schema
var CommentSchema   = new mongoose.Schema({
  commentText: String,
  username: String,
  tuneId: String,
  timestamp: { type: Date, default: Date.now }
});


// Export the Mongoose model
module.exports = mongoose.model('Comment', CommentSchema);

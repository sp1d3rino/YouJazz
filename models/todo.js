// Load required packages
var mongoose = require('mongoose');

// Define our beer schema
var TodoSchema   = new mongoose.Schema({
  text: String,
  title: String,
  userId: String

});

// Export the Mongoose model
module.exports = mongoose.model('Todo', TodoSchema);

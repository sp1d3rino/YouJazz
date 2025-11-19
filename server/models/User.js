// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  displayName: String,
  email: String,
  picture: String
});

module.exports = mongoose.model('User', UserSchema);
// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  facebookId: { type: String, unique: true, sparse: true },  
  googleId: { type: String, required: true, unique: true },
  displayName: String,
  email: { type: String, unique: true, sparse: true },  // Facoltativo ma utile
  picture: String
});

module.exports = mongoose.model('User', UserSchema);
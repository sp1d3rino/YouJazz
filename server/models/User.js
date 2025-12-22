// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // OAuth fields
  facebookId: { type: String, unique: true, sparse: true },  
  googleId: { type: String, unique: true, sparse: true },
  
  // Local auth fields
  username: { type: String, unique: true, sparse: true },
  password: { type: String }, // hashed password
  email: { type: String, unique: true, sparse: true },
  
  // Common fields
  displayName: String,
  picture: String,
  
  // Activation
  isActivated: { type: Boolean, default: false },
  activationToken: String,
  activationExpires: Date
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
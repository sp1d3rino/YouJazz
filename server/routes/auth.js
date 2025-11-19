// routes/auth.js
const express = require('express');
const passport = require('passport');
const router = express.Router();

// Login con Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login.html');
  });
});

// Restituisce info utente loggato (per frontend)
router.get('/me', (req, res) => {
  if (req.user) {
    res.json({
      id: req.user._id,
      displayName: req.user.displayName,
      email: req.user.email,
      picture: req.user.picture
    });
  } else {
    res.status(401).json({ error: 'Non autenticato' });
  }
});

module.exports = router;
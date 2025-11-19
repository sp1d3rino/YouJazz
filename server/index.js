require('dotenv').config(); // ← DEVE ESSERE LA PRIMA RIGA

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const Song = require('./models/Song');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const app = express();

// ==== VERIFICA SUBITO SE LE VARIABILI SONO CARICATE ====
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('ERRORE: GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET mancanti nel .env');
  process.exit(1);
}

// Middleware
app.use(cors({ origin: 'https://youjazz.spi.cloudns.org', credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Sessioni
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://youjazz.spi.cloudns.org/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await new User({
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
        picture: profile.photos[0]?.value
      }).save();
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Rotte
app.use('/auth', authRoutes);

// ==== ROTTE PROTETTE ====
const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Login richiesto' });
  next();
};

app.get('/api/songs', requireAuth, async (req, res) => {
  const songs = await Song.find().sort({ createdAt: -1 });
  res.json(songs);
});

app.get('/api/songs/:id', requireAuth, async (req, res) => {
  const song = await Song.findOne({ _id: req.params.id});
  if (!song) return res.status(404).json({ error: 'Non trovato' });
  res.json(song);
});

app.post('/api/songs', requireAuth, async (req, res) => {
  const song = new Song({ ...req.body, owner: req.user._id });
  await song.save();
  res.json(song);
});

app.put('/api/songs/:id', requireAuth, async (req, res) => {
  const song = await Song.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    req.body,
    { new: true }
  );
  if (!song) return res.status(404).json({ error: 'Non trovato' });
  res.json(song);
});

app.delete('/api/songs/:id', requireAuth, async (req, res) => {
  await Song.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  res.json({ success: true });
});

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connesso'))
  .catch(err => {
    console.error('Errore MongoDB:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
  console.log(`Login: http://localhost:${PORT}/login.html`);
});
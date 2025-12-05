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
app.use(cors({ origin: process.env.CALLBACK_URL, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, './public')));

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
  callbackURL: process.env.CALLBACK_URL
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

// GET /api/songs — Lista con owner popolato
app.get('/api/songs', async (req, res) => {
  try {
    const query = req.user 
      ? { $or: [{ isPublic: true }, { owner: req.user._id }] }
      : { isPublic: true };
    
    const songs = await Song.find(query)
      .populate('owner', 'displayName')
      .sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// GET /api/songs/:id — Singolo con owner popolato
app.get('/api/songs/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('owner', 'displayName');  // ← Aggiungi questo
    if (!song) return res.status(404).json({ error: 'Brano non trovato' });
    res.json(song);
  } catch (err) {
    console.error('Errore caricamento brano:', err);
    res.status(500).json({ error: 'Errore del server' });
  }
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


// POST /api/songs/:id/like → Toggle like
app.post('/api/songs/:id/like', requireAuth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Brano non trovato' });

    const userId = req.user._id;
    const index = song.likes.indexOf(userId);

    if (index === -1) {
      song.likes.push(userId);
    } else {
      song.likes.splice(index, 1);
    }

    await song.save();
    res.json({ likes: song.likes.length, hasLiked: index === -1 });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});


app.post('/api/songs/:id/play', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Incrementa il contatore (se non esiste, parte da 0)
    song.playCount = (song.playCount || 0) + 1;
    await song.save();

    // Risposta minima (il frontend non la usa, ma è buona pratica)
    res.json({ success: true, playCount: song.playCount });
  } catch (err) {
    console.error('Errore increment playCount:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/songs/:id/public', requireAuth, async (req, res) => {
  try {
    console.log('Updating public status for song:', req.params.id, 'to', req.body.isPublic);
    const song = await Song.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { isPublic: req.body.isPublic },
      { new: true }
    );
    if (!song) return res.status(404).json({ error: 'Not found or unauthorized' });
    res.json({ success: true, isPublic: song.isPublic });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
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

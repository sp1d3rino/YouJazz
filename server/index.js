require('dotenv').config(); // ← DEVE ESSERE LA PRIMA RIGA

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const Song = require('./models/Song');
const User = require('./models/User');
const AppStats = require('./models/AppStats');
const AICache = require('./models/AICache');
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

app.use(express.static(path.join(__dirname, '../public')));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // allow nginx ssl temination  
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,  
    sameSite: 'lax'  
  }
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




passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,  // Adatta se localhost
  profileFields: ['id', 'displayName', 'photos', 'email']  // Richiedi questi campi
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ facebookId: profile.id });

    if (!user) {
      // Crea nuovo utente se non esiste
      user = new User({
        facebookId: profile.id,
        displayName: profile.displayName,
        email: profile.emails ? profile.emails[0].value : null,
        picture: profile.photos ? profile.photos[0].value : null
      });
      await user.save();
    } else {
      // Aggiorna info se necessario
      user.displayName = user.displayName || profile.displayName;
      user.picture = user.picture || (profile.photos ? profile.photos[0].value : null);
      await user.save();
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));


// Rotte
app.use('/auth', authRoutes);

// ==== ROTTE PROTETTE ====
const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Login richiesto' });
  next();
};




const requireSiteAccess = (req, res, next) => {
  // Se è loggato → sempre OK
  if (req.user) return next();
  // Per guest: controlla solo che la richiesta venga dal tuo dominio
  const origin = req.get('origin');
  const referer = req.get('referer');
  const allowed = process.env.SITE_URL || 'https://www.youjazz.org';

  if (origin && origin.startsWith(allowed) || referer && referer.startsWith(allowed)) {
    return next();
  }

  return res.status(403).json({ error: 'Unauthorized access' });
};



// GET /api/songs — Lista con owner popolato
app.get('/api/songs', requireSiteAccess, async (req, res) => {
  try {
    const query = req.user
      ? { $or: [{ isPublic: true }, { owner: req.user._id }] }
      : { isPublic: true };

    const songs = await Song.find(query)
      .populate('owner', 'displayName')
      .sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/songs/:id — Singolo con owner popolato
app.get('/api/songs/:id', requireSiteAccess, async (req, res) => {
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

app.post('/api/songs/:id/favourite', requireAuth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Brano non trovato' });

    const userId = req.user._id;
    const index = song.favourites.indexOf(userId);

    if (index === -1) {
      song.favourites.push(userId);
    } else {
      song.favourites.splice(index, 1);
    }

    await song.save();
    res.json({ isFavourite: index === -1, favouritesCount: song.favourites.length });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});
app.post('/api/songs/save-as', requireAuth, async (req, res) => {
  try {
    const { title, bpm, style, grid, measures } = req.body;

    const newSong = new Song({
      title: title,
      bpm,
      style,
      grid,
      measures,
      owner: req.user._id,
      isPublic: false
    });

    await newSong.save();
    res.json(newSong);
  } catch (err) {
    res.status(500).json({ error: 'Errore save-as' });
  }
});

app.post('/api/songs/ai-reharmonize', requireAuth, async (req, res) => {
  try {
    const { measures } = req.body;

    // Estrai titolo
    const title = measures.shift();

    // Costruisci input per cache lookup
    const chordsInput = measures
      .filter(m => m.chord)
      .map(m => `${m.chord}|${m.beats}`)
      .join(' ');

    // ✅ STEP 1: Cerca nella cache
    const cached = await AICache.findOne({ 
      songTitle: title,
      originalProgression: chordsInput 
    });

    if (cached) {
      console.log('✅ AI Cache HIT per:', title);
      return res.json({ measures: cached.reharmonizedMeasures, fromCache: true });
    }

    console.log('❌ AI Cache MISS per:', title, '→ chiamata OpenAI');

    // ✅ STEP 2: Chiamata OpenAI (codice originale)
    let totalBeats = 0;
    for (const m of measures) {
      totalBeats += m.beats;
    }

    const prompt = `You are a jazz reharmonization expert. I provide you the rules for Harmonic Substitutions in Gypsy Jazz
    --start of rules--
1. DOMINANT CHORDS (7, 9, 13)
Primary Substitutions
A. Tritone Substitution (SubV7)
The dominant chord at a tritone distance (♭II7):

G7 → D♭7 (same keynotes: B-F / C♭-F)
D7 → A♭7
A7 → E♭7

B. Secondary Dominants
Using the dominant of the dominant:

G7 → D7 → G7 (temporary II-V)
C7 → G7 → C7

C. Passing Diminished
Diminished chord one semitone above the tonic of resolution:

G7 → Cmaj7 becomes G7 → G#o7 → Cmaj7
D7 → Gm becomes D7 → Ebo7 → Gm

D. Altered Dominant Chords

G7 → G7♭9, G7♯5, G7alt (♭9♯9♯11♭13)
Widely used in cadences: D7alt → G7alt → Cmaj7

Advanced Manouche Substitutions
E. Double Chromatic Approach
Two chromatic dominants before resolution:

G7 → Cmaj7 becomes A♭7 → G7 → Cmaj7
D7 → G7 becomes E♭7 → D7 → G7

F. Cadence iii-VI-ii-V
Expand with secondary dominants:

Dm7 - G7 - Cmaj7 becomes Em7 - A7 - Dm7 - G7 - Cmaj7

2. MINOR CHORDS 6 (m6, m7)
Primary Substitutions
A. Minor/Major Modal Interchange

Am6 → A7 (tension majorization)
Dm6 → D7 → resolves to G

B. Half-Diminished Substitution

Am6 → Am7♭5 (darker sound)
Dm6 → Dm7♭5 → G7alt

C. Major Chord with a Minor Third Distance

Am6 → Cmaj7 (relative major)
Em6 → Gmaj7

Advanced Manouche Substitutions
D. Diminished Approach
Very typical of the Django style:

Am6 → A°7 → Am6 (tonic-diminished oscillation)
Dm6 → D#°7 → Dm6

E. ii-V Minor
Replace a static minor with a progression:

Am6 (2 measures) → Bm7♭5 - E7alt - Am6 (plus movement)
Dm6 → Em7♭5 - A7♭9 - Dm6

F. Minor 6/9 with Closed Voicing
Add a ninth by color:

Am6 → Am6/9 (A-C-E-F#-B)
Characteristic Manouche sound

3. TYPICAL GYPSY JAZZ PROGRESSIONS
Classical Turnaround
| Cmaj7 | Am7 | Dm7 | G7 |

Becomes:
| Cmaj7 | C#o7 | Dm7 | D#o7 | Em7 | A7 | Dm7 | G7 |
Django Minor Blues
| Am6 | Am6 | Am6 | Am6 |
| Dm6 | Dm6 | Am6 | Am6 |
| Bm7♭5 | E7 | Am6 | E7 |

Reharmonize:
| Am6 | Ao7 | Am6 | Bm7♭5 E7alt |
| Dm6 | D#o7 | Am6 | C#o7 |
| Bm7♭5 | Bb7 E7alt | Am6 F7 | Bm7♭5 E7♯9 |
Cadence II-V-I Manouche
Standard:
| Dm7 | G7 | Cmaj7 | Cmaj7 |

Manouche Style:
| Dm7 | D#o7 | Em7 A7 | Dm7 Db7 |
| Cmaj7 | C#o7 | Dm7 | G7♭9 |

4. SPECIFIC REHARMONIZATION PATTERNS
A. Substitutions for D7 → Gm (very common)
Basic: | D7 | Gm |
Option 1: | D7alt | D#°7 Gm |
Option 2: | Eb7 | D7♭9 Gm |
Option 3: | D7 | Ab7 G7 | Cmaj7 (change of destination)
B. Substitutions for Am6 → Dm6
Basic: | Am6 | Dm6 |
Option 1: | Am6 | A°7 Dm6 |
Option 2: | Am6 A7 | Dm6 |
Option 3: | Bm7♭5 E7 | Am6 A7 | Dm6 |
C. Chromatic Cycle of Fifths
| E7 | Eb7 | D7 | Db7 | C |
Each dominant descends a semitone instead of resolving.

5. MANOUCHE GOLDEN RULES

Diminished everywhere: the 7th can be inserted chromatically between almost any chord
Dominant in a chain: V7/V → V7 → I is a mantra
Tonic-diminished swing: typical on minor chords (Am - Ao7 - Am)
Tritone substitutions everywhere: especially in final cadences
Chromatic approaches: approach the chords from a semitone above or below
Avoid sus chords: they are not part of the style (always prefer major or minor thirds)

6. PRACTICAL EXAMPLES ON STANDARDS
Minor Swing (Am)
Standard:
| Am6 | Dm6 | E7 | Am6 |

Reharmonized:
| Am6 Ao7 | Dm6 D#o7 | E7 Bb7 | Am6 A7 |
All of Me (C)
Standard:
| C | E7 | A7 | Dm |

Reharmonized:
| Cmaj7 C#o7 | E7 Bb7 | A7 Eb7 | Dm7 G7 |
    
but don't use every time all the substitutions, use them wisely to create a natural and musical reharmonization.
VERY IMPORTANT: do not change the total length of the original version e.g if there were ${totalBeats} beats then the alternative must have ${totalBeats} beats.  
Consider that the possible chords are the combination of base chords like  A, B, C, D, E, F, G and possible extensions are #,♭, ø(for half diminished), o(for dimished), 6,7, 9, m (for minor), maj7.
For example Cmaj7, Dm7, G7, F#ø7, B♭o, Am6 are valid chords.
--end of rules--

Now given the song named ${title} and its chord progression is ${chordsInput} where |4 = whole measure (4 beats), |3 = 3 beats, |2 = half measure (2 beats), |1 = quarter measure (1 beat):
 and  and the style is manouche or gypsy so the reharmonization must fit the melodic and stylistic context of the song and use the rules specified above. 
Generate an alternative jazz reharmonization using substitutions, extensions. change only where is possible otherwise keep the same chord. Return ONLY the new progression in the same format (chord|beats), separated by spaces.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        input: prompt,
        temperature: 0.8,
        max_output_tokens: 500
      })
    });

    if (!response.ok) throw new Error('OpenAI API error');

    const data = await response.json();

    let aiOutput = null;

    if (data.output_text) {
      aiOutput = data.output_text;
    } else if (data.output && Array.isArray(data.output)) {
      const textChunks = data.output
        .flatMap(o => o.content)
        .filter(c => c.type === "output_text")
        .map(c => c.text);

      if (textChunks.length > 0) {
        aiOutput = textChunks.join("");
      }
    }

    if (!aiOutput) {
      throw new Error("Could not extract text from OpenAI response");
    }

    aiOutput = aiOutput.replace(/b/g, '♭').trim();

    const newMeasures = aiOutput.split(/\s+/).map(token => {
      const [chord, beats] = token.split('|');
      return { chord: chord.trim(), beats: parseInt(beats) || 4 };
    }).filter(m => m.chord && m.beats);

    // ✅ STEP 3: Salva nella cache
    try {
      await AICache.create({
        songTitle: title,
        originalProgression: chordsInput,
        reharmonizedMeasures: newMeasures
      });
      console.log('💾 Salvato in cache:', title);
    } catch (cacheErr) {
      console.warn('⚠️ Errore salvataggio cache (duplicato?):', cacheErr.message);
    }

    res.json({ measures: newMeasures, fromCache: false });
  } catch (err) {
    console.error('AI reharmonization error:', err);
    res.status(500).json({ error: 'AI error' });
  }
});
app.post('/api/songs/:id/play', async (req, res) => {
  try {
    // Incrementa stat globale SEMPRE (anche per guest)
    await AppStats.findOneAndUpdate(
      { _id: 'global' },
      { $inc: { totalPlays: 1 } },
      { upsert: true, new: true }
    );

    // Se non è guest, incrementa anche il playcount del brano
    if (req.params.id !== 'guest') {
      await Song.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

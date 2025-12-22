// routes/auth.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const nodemailer = require('nodemailer');

//login with Facebook
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email', 'public_profile'] })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login.html' }),
  (req, res) => {
    res.redirect('/');
  }
);

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
router.get('/me', async (req, res) => {
  try {
    // Check OAuth user first (Passport)
    if (req.user) {
      return res.json({
        id: req.user._id.toString(),
        displayName: req.user.displayName,
        email: req.user.email,
        picture: req.user.picture
      });
    }

    // Check session-based user (local auth)
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        return res.json({
          id: user._id.toString(),
          displayName: user.displayName || user.username,
          email: user.email,
          username: user.username
        });
      }
    }

    // Not authenticated
    return res.status(401).json({ message: 'Not authenticated' });

  } catch (err) {
    console.error('Auth check error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



// before basic auth

// Email transporter configuration
const transporter = nodemailer.createTransport({
  // Configure with your email service
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Check username availability
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    const existingUser = await User.findOne({ username });
    res.json({ available: !existingUser });
  } catch (err) {
    res.status(500).json({ message: 'Error checking username' });
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user
    const user = new User({
      username,
      password: hashedPassword,
      email,
      displayName: username,
      isActivated: false,
      activationToken,
      activationExpires
    });

    await user.save();

    // Send activation email
    const activationLink = `${process.env.SITE_URL || 'http://localhost:3000'}/auth/activate/${activationToken}`;

    await transporter.sendMail({
      from: 'YouJazz <noreply@youjazz.org>',
      to: email,
      subject: 'Activate your YouJazz account',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
      <h1 style="color: #ff3366; text-align: center; font-size: 32px; margin-bottom: 20px; text-shadow: 0 0 10px #ff3366;">
        Welcome to YouJazz! 🎶
      </h1>
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Thank you for registering on YouJazz. Please click the button below to activate your account:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${activationLink}" 
           style="display: inline-block; padding: 15px 30px; background-color: #ff3366; color: white; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 50px; box-shadow: 0 4px 15px rgba(255,51,102,0.4);">
          Activate Account
        </a>
      </div>
      <p style="font-size: 14px; color: #666; text-align: center;">
        Or copy this link:<br>
        <a href="${activationLink}" style="color: #ff3366; word-break: break-all;">${activationLink}</a>
      </p>
      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
        This link expires in 24 hours. If you didn't register, ignore this email.
      </p>
    </div>
  `

    });

    res.json({ message: 'Registration successful. Please check your email.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Activate account
router.get('/activate/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      activationToken: req.params.token,
      activationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.send('<h1>Invalid or expired activation link</h1>');
    }

    user.isActivated = true;
    user.activationToken = undefined;
    user.activationExpires = undefined;
    await user.save();

    return res.redirect('/login.html?activation=success');



  } catch (err) {
    res.status(500).send('<h1>Error activating account</h1>');
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActivated) {
      return res.status(403).json({ message: 'Please activate your account first' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Set session
    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName
    };

    res.json({ message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});


module.exports = router;
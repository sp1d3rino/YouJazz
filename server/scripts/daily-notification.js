require('dotenv').config({ path: '/home/spi/YouJazz/server/.env' });
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Song = require('../models/Song');
const User = require('../models/User');

// Email transporter (stesso di auth.js)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

async function sendDailyDigest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connesso');

    // Calcola 24 ore fa
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log('📅 Cerco brani creati dopo:', yesterday.toISOString());
    console.log('📅 Data/ora corrente:', new Date().toISOString());

    // Trova brani pubblici creati nelle ultime 24 ore
    const newSongs = await Song.find({
      isPublic: true,
      createdAt: { $gte: yesterday }
    })
      .populate('owner', 'displayName username')
      .sort({ createdAt: -1 });

    console.log(`🔍 Trovati ${newSongs.length} brani pubblici recenti`);
    
    // Debug: mostra tutti i brani trovati
    if (newSongs.length > 0) {
      newSongs.forEach(song => {
        console.log(`   - "${song.title}" creato il ${song.createdAt.toISOString()}`);
      });
    }

    if (newSongs.length === 0) {
      console.log('ℹ️  Nessun nuovo brano nelle ultime 24 ore');
      
      // Debug: mostra tutti i brani pubblici nel DB
      const allPublicSongs = await Song.find({ isPublic: true })
        .sort({ createdAt: -1 })
        .limit(5);
      
      console.log('\n📋 Ultimi 5 brani pubblici nel DB:');
      allPublicSongs.forEach(song => {
        console.log(`   - "${song.title}" | Public: ${song.isPublic} | Creato: ${song.createdAt.toISOString()}`);
      });
      
      await mongoose.disconnect();
      return;
    }

    console.log(`🎵 Found ${newSongs.length} new songs`);

    // Trova tutti gli utenti attivati con email
    const users = await User.find({
      email: { $exists: true, $ne: null }
    });

    console.log(`👥 Send notifications to ${users.length} users`);

    // Prepara lista brani in HTML
    const songsList = newSongs.map(song => {
      const author = song.owner?.displayName || song.owner?.username || 'Unknown';
      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px 8px;">
            <strong style="color: #ff3366;">${song.title}</strong>
          </td>
          <td style="padding: 12px 8px; color: #666;">
            ${author}
          </td>
          <td style="padding: 12px 8px; color: #999; font-size: 12px;">
            ${song.style || 'Manouche'}
          </td>
        </tr>
      `;
    }).join('');

    // Invia email a ciascun utente
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        await transporter.sendMail({
          from: 'YouJazz <noreply@youjazz.org>',
          to: user.email,
          subject: `🎵 ${newSongs.length} new song${newSongs.length > 1 ? 's' : ''} on YouJazz!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
              <h1 style="color: #ff3366; text-align: center; font-size: 28px; margin-bottom: 10px; text-shadow: 0 0 10px #ff3366;">
                New Jazz on YouJazz! 🎶
              </h1>
              <p style="font-size: 14px; color: #666; text-align: center; margin-bottom: 30px;">
                ${newSongs.length} new song${newSongs.length > 1 ? 's have' : ' has'} been added in the last 24 hours
              </p>
              
              <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <thead>
                  <tr style="background-color: #ff3366; color: white;">
                    <th style="padding: 12px 8px; text-align: left;">Title</th>
                    <th style="padding: 12px 8px; text-align: left;">Author</th>
                    <th style="padding: 12px 8px; text-align: left;">Style</th>
                  </tr>
                </thead>
                <tbody>
                  ${songsList}
                </tbody>
              </table>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.SITE_URL || 'https://www.youjazz.org'}" 
                   style="display: inline-block; padding: 15px 30px; background-color: #ff3366; color: white; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 50px; box-shadow: 0 4px 15px rgba(255,51,102,0.4);">
                  Listen Now
                </a>
              </div>

              <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
                You're receiving this because you have an account on YouJazz.<br>
                To unsubscribe, please contact us.
              </p>
            </div>
          `
        });
        successCount++;
        console.log(`✅ Email sent to ${user.email}`);
      } catch (emailErr) {
        failCount++;
        console.error(`❌ Send error to ${user.email}:`, emailErr.message);
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Sent: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);

    await mongoose.disconnect();
    console.log('✅ Script completed');

  } catch (err) {
    console.error('❌ Critical error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Esegui
sendDailyDigest();
# YouJazz

[![GitHub stars](https://img.shields.io/github/stars/sp1d3rino/YouJazz?style=social)](https://github.com/sp1d3rino/YouJazz) [![GitHub license](https://img.shields.io/github/license/sp1d3rino/YouJazz)](https://github.com/sp1d3rino/YouJazz/blob/main/LICENSE) [![GitHub issues](https://img.shields.io/github/issues/sp1d3rino/YouJazz)](https://github.com/sp1d3rino/YouJazz/issues)

YouJazz is an innovative web-based **Gypsy Jazz lead sheet composer and player**. Create chord progressions on an intuitive grid, switch between swing and bossa styles, and play them back with high-fidelity audio samples. Perfect for jazz musicians, educators, and enthusiasts who want to compose, rehearse, or jam on the go.

<img width="1488" height="807" alt="image" src="https://github.com/user-attachments/assets/edea209a-b73d-4e9d-b7ad-b2555767c8a2" />


## Features

- **Grid-Based Composition**: Build chord charts on a customizable grid (e.g., 4x4 or 8x8 measures). Drag-and-drop chords and extensions from a palette.
- **Dual Styles**: Switch between **Swing** (La Pompe rhythm) and **Bossa Nova** with one click. Audio samples adapt automatically.
- **Real-Time Playback**: High-quality MP3 samples stretched with pitch preservation (using Tone.js). Includes count-in (4 beats) and seamless looping.
- **User Accounts**: Login with Google for saving, sharing, and liking songs. Guest mode for read-only access.
- **Transpose**: Load or create the song and change the song tone.
- **AI reharmonization**: Use AI to explore arrangement alternatives 
- **Persistent Data**: Load from dropdown or create new; save to backend (MongoDB).

YouJazz is built for **Gypsy Jazz lovers** – inspired by Django Reinhardt and Stéphane Grappelli – but adaptable to any jazz standard.

## Tech Stack

### Frontend
- **Vanilla JavaScript**: Core app logic (no frameworks for lightweight performance).
- **Web Audio API**: Real-time audio playback with `AudioContext` and `BufferSource`.
- **Tone.js**: Time-stretching library for tempo adjustment without pitch shift (e.g., BPM 80-160).
- **HTML5/CSS3**: Responsive grid layout with flexbox and CSS Grid for chord measures.
- **Drag & Drop API**: Native browser support for chord palette interactions.

### Backend
- **Node.js + Express**: Simple API server for authentication and CRUD operations.
- **MongoDB + Mongoose**: Database for storing songs, users, and likes.
- **Passport.js**: Google OAuth for secure login.
- **Session Management**: Express-session for persistent user state.

### Audio
- **MP3 Samples**: Pre-recorded Gypsy Jazz chords in swing and bossa styles (80, 120, 160 BPM variants for optimal quality).
- **No External Dependencies**: All audio processing client-side for low latency.

### Deployment
- **Static Hosting**: Frontend served via Express static files.

## Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- Google OAuth credentials (for login)

### Setup
1. **Clone the Repo**:
   ```
   git clone https://github.com/sp1d3rino/YouJazz.git
   cd YouJazz
   ```

2. **Install Dependencies**:
   ```
   npm install
   ```

3. **Configure Environment** (.env1 and .env files): create these two .env file where only the port changes. the deploy.sh will copy them in dist directory
   ```
   MONGODB_URI=mongodb://localhost:27017/youjazz
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=your_session_secret
   PORT=3000
   ```

4. **Run the App**:
   ```
   npm start
   ```
   Open `http://localhost:3000` in your browser.

5. **Deploy to Server** (Ubuntu example):
   ```
   git clone https://github.com/sp1d3rino/YouJazz.git
   cd YouJazz
   npm install
   # Configure .env1 with production values for instance 1
   ./deploy.sh yj 1
   # Configure .env2 with production values for instance 2
   ./deploy.sh yj 2
   ```

### Audio Samples
- Download pre-recorded MP3s for chords (A-G, extensions) in swing/bossa at different BPM.

## Usage

1. **Login**: Use Google OAuth for full features (save/load songs, likes). Guest mode for browsing.
2. **Create New Song**: Click "New Song" → Set grid size (e.g., 4x4) → Drag chords from palette to measures.
3. **Edit Chords**: Drop extensions (#, m7, etc.) on existing chords. Auto-fit resizes text.
4. **Switch Style**: Click "Swing" or "Bossa" – audio and visuals update instantly.
5. **Playback**: Adjust BPM slider → Click "Play" for count-in + loop. "Stop" pauses.
6. **Likes**: Browse songs in dropdown (shows thumbs-up count). Logged-in users click thumbs-up below "Clear All" to vote.
7. **Save/Load**: "Save Song" for your creations. Load from shared list.


## Screenshots

| How to use it | ReadOnly mode |
|-------------|--------------------|
| <img width="697" height="609" alt="image" src="https://github.com/user-attachments/assets/ccb2b6e9-afef-4a98-b295-5f64d43742ce" /> |<img width="1677" height="796" alt="image" src="https://github.com/user-attachments/assets/bd84b738-ce3c-41ed-beab-578f20cc3cba" />|

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/gypsyjazz`).
3. Commit changes (`git commit -m 'Add amazing chord feature'`).
4. Push to branch (`git push origin feature/gypsyjazz`).
5. Open Pull Request.

I welcome PRs for new ideas, styles, or UI improvements. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Gypsy Jazz masters: Django Reinhardt, Stéphane Grappelli.
- Tone.js for audio stretching.
- Thanks to contributors and the open-source community!

---

⭐ **Star this repo if you love jazz and coding!**  
Questions? Open an issue or reach out on GitHub.

Built with ❤️ for jazz lovers worldwide. 🎸

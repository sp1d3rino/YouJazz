// public/auth.js  ← VERSIONE FUNZIONANTE NEL BROWSER
class Auth {
  static async check() {
    try {
      const res = await fetch('/auth/me', { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        document.body.classList.add('logged-in');

        const nameEl = document.getElementById('user-name');
        const picEl = document.getElementById('user-pic');
        if (nameEl) nameEl.textContent = user.displayName || 'User';
        if (picEl) picEl.src = user.picture || 'https://via.placeholder.com/40';

      } else {
        // Non loggato → vai al login
        if (window.location.pathname !== '/login.html') {
          window.location.href = '/login.html';
        }
      }
    } catch (err) {
      console.error('Errore auth check:', err);
      window.location.href = '/login.html';
    }
  }

  static logout() {
    window.location.href = '/auth/logout';
  }
}

// Esegui al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
  Auth.check();
});
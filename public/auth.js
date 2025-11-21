// public/auth.js
class Auth {
  static async check() {
    try {
      const res = await fetch('/auth/me', { credentials: 'include' });
      
      if (res.ok) {
        const user = await res.json();
        document.body.classList.add('logged-in');
        document.body.classList.remove('guest-mode');

        const nameEl = document.getElementById('user-name');
        const picEl = document.getElementById('user-pic');
        if (nameEl) nameEl.textContent = user.displayName || 'User';
        if (picEl) picEl.src = user.picture || 'https://via.placeholder.com/40';

      } else {
        // Not logged in → check if guest mode
        const params = new URLSearchParams(window.location.search);
        if (params.get('guest') === 'true') {
          document.body.classList.add('guest-mode');
          document.body.classList.remove('logged-in');
          // Allow guest to stay on the app
          return;
        }

        // Not logged in and not guest → redirect to login
        if (window.location.pathname !== '/login.html') {
          window.location.href = '/login.html';
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      if (window.location.pathname !== '/login.html') {
        window.location.href = '/login.html';
      }
    }
  }

  static logout() {
    window.location.href = '/auth/logout';
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  Auth.check();
});
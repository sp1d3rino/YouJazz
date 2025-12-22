class Auth {
  static async check() {
    try {
      const res = await fetch('/auth/me', { credentials: 'include' });
      
      if (res.ok) {
        const user = await res.json();
        document.body.classList.add('logged-in');
        document.body.classList.remove('guest-mode', 'auth-checking');

        const nameEl = document.getElementById('user-name');
        const picEl = document.getElementById('user-pic');
        if (nameEl) nameEl.textContent = user.displayName || 'User';
        if (picEl) picEl.src = user.picture || 'https://i.pravatar.cc/300';

        // Hide loader and show page
        this.hideLoader();

      } else {
        // Not logged in → check if guest mode
        const params = new URLSearchParams(window.location.search);
        if (params.get('guest') === 'true') {
          document.body.classList.add('guest-mode');
          document.body.classList.remove('logged-in', 'auth-checking');
          // Allow guest to stay on the app
          this.hideLoader();
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

  static hideLoader() {
    const loader = document.getElementById('auth-loader');
    if (loader) {
      loader.classList.add('hidden');
      // Remove from DOM after transition
      setTimeout(() => loader.remove(), 300);
    }
    document.body.classList.remove('auth-checking');
  }

  static logout() {
    window.location.href = '/auth/logout';
  }
}

// Run IMMEDIATELY on script load (before DOMContentLoaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Auth.check());
} else {
  // Document already loaded
  Auth.check();
}
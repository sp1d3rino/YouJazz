// auth-modal.js - Sign In and Register Modal System

function openSignInModal() {
  const modal = document.getElementById('authModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');

  title.textContent = 'Sign In';
  content.innerHTML = `
    <form id="signinForm" onsubmit="handleSignIn(event)">
      <div class="form-group">
        <label for="signin-username">Username</label>
        <input type="text" id="signin-username" name="username" required>
      </div>
      <div class="form-group">
        <label for="signin-password">Password</label>
        <input type="password" id="signin-password" name="password" required>
      </div>
      <button type="submit" class="submit-btn signin">Sign In</button>
    </form>
  `;

  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function openRegisterModal() {
  const modal = document.getElementById('authModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');

  title.textContent = 'Register';
  content.innerHTML = `
    <form id="registerForm" onsubmit="handleRegister(event)">
      <div class="form-group">
        <label for="reg-username">Username</label>
        <input type="text" id="reg-username" name="username" required>
        <div class="error" id="username-error">Username already taken</div>
        <div class="success" id="username-success">✓ Username available</div>
      </div>
      <div class="form-group">
        <label for="reg-password">Password</label>
        <input type="password" id="reg-password" name="password" required>
        <div class="error" id="password-error">Password must be at least 8 characters with a symbol (!;._?=()/&%$£)</div>
      </div>
      <div class="form-group">
        <label for="reg-confirm">Confirm Password</label>
        <input type="password" id="reg-confirm" name="confirmPassword" required>
        <div class="error" id="confirm-error">Passwords do not match</div>
      </div>
      <div class="form-group">
        <label for="reg-email">Email</label>
        <input type="email" id="reg-email" name="email" required>
        <div class="error" id="email-error">Please use a valid email from verified providers (Gmail, Hotmail, Outlook, etc.)</div>
      </div>
      <button type="submit" class="submit-btn register" id="registerBtn">Register</button>
    </form>
  `;

  modal.classList.add('show');
  document.body.style.overflow = 'hidden';

  // Add real-time validation
  setupValidation();
}

function closeModal() {
  const modal = document.getElementById('authModal');
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

function setupValidation() {
  const usernameInput = document.getElementById('reg-username');
  const passwordInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm');
  const emailInput = document.getElementById('reg-email');

  let usernameTimeout;

  // Username availability check
  usernameInput.addEventListener('input', function () {
    clearTimeout(usernameTimeout);
    const username = this.value.trim();

    if (username.length < 3) return;

    usernameTimeout = setTimeout(async () => {
      try {
        const response = await fetch('/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (data.available) {
          usernameInput.classList.remove('invalid');
          usernameInput.classList.add('valid');
          document.getElementById('username-error').style.display = 'none';
          document.getElementById('username-success').style.display = 'block';
        } else {
          usernameInput.classList.remove('valid');
          usernameInput.classList.add('invalid');
          document.getElementById('username-error').style.display = 'block';
          document.getElementById('username-success').style.display = 'none';
        }
      } catch (err) {
        console.error('Error checking username:', err);
      }
    }, 500);
  });

  // Password validation
  passwordInput.addEventListener('input', function () {
    const password = this.value;
    const hasSymbol = /[!;._?=()/&%$£]/.test(password);
    const isLongEnough = password.length >= 8;

    if (hasSymbol && isLongEnough) {
      passwordInput.classList.remove('invalid');
      passwordInput.classList.add('valid');
      document.getElementById('password-error').style.display = 'none';
    } else {
      passwordInput.classList.remove('valid');
      passwordInput.classList.add('invalid');
      document.getElementById('password-error').style.display = 'block';
    }

    // Also check confirm password if filled
    if (confirmInput.value) {
      validateConfirmPassword();
    }
  });

  // Confirm password validation
  confirmInput.addEventListener('input', validateConfirmPassword);

  function validateConfirmPassword() {
    if (confirmInput.value === passwordInput.value && confirmInput.value.length > 0) {
      confirmInput.classList.remove('invalid');
      confirmInput.classList.add('valid');
      document.getElementById('confirm-error').style.display = 'none';
    } else {
      confirmInput.classList.remove('valid');
      confirmInput.classList.add('invalid');
      document.getElementById('confirm-error').style.display = 'block';
    }
  }

  // Email validation
  let validDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com']; // Default fallback
  // Load domain list asynchronously
  fetch('/domainlist.json')
    .then(res => res.json())
    .then(data => {
      if (data.validDomains && Array.isArray(data.validDomains)) {
        validDomains = data.validDomains;
        console.log('✓ Domain list loaded:', validDomains.length, 'domains');
      }
    })
    .catch(err => {
      console.warn('⚠ Could not load domain list, using defaults:', err);
    });
 

  emailInput.addEventListener('input', function () {
    const email = this.value.toLowerCase();
    const emailDomain = email.split('@')[1];

    // Check only if domain exists and validDomains is populated
    if (emailDomain && validDomains && validDomains.length > 0 && validDomains.includes(emailDomain)) {
      emailInput.classList.remove('invalid');
      emailInput.classList.add('valid');
      document.getElementById('email-error').style.display = 'none';
    } else if (emailDomain) {
      emailInput.classList.remove('valid');
      emailInput.classList.add('invalid');
      document.getElementById('email-error').style.display = 'block';
    }
  });



}

async function handleSignIn(event) {
  event.preventDefault();

  const form = event.target;
  const username = form.username.value.trim();
  const password = form.password.value;

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Successful login - redirect to main app
      window.location.href = '/';
    } else {
      closeModal();
      YouJazz.showMessage("Error", data.message || 'Invalid username or password');
    }
  } catch (err) {
    console.error('Login error:', err);
    closeModal();
    YouJazz.showMessage("Error", 'An error occurred during login. Please try again.');
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const form = event.target;
  const username = form.username.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  const email = form.email.value.toLowerCase();

  // Final validation
  const hasSymbol = /[!;._?=()/&%$£]/.test(password);
  const isLongEnough = password.length >= 8;

  if (!hasSymbol || !isLongEnough) {
    closeModal();
    YouJazz.showMessage("Error", "Password must be at least 8 characters and contain a symbol (!;._?=()/&%$£)");
    return;
  }

  if (password !== confirmPassword) {
    closeModal();
    YouJazz.showMessage("Error", "Passwords do not match");
    return;
  }

 
  // Validate email domain against loaded list
  const emailDomain = email.split('@')[1];

  // Fetch domain list for final validation
  let validDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com']; // Default
  try {
    const domainRes = await fetch('/domainlist.json');
    if (domainRes.ok) {
      const domainData = await domainRes.json();
      if (domainData.validDomains && Array.isArray(domainData.validDomains)) {
        validDomains = domainData.validDomains;
      }
    }
  } catch (err) {
    console.warn('Using default domain list:', err);
  }
 
  if (!emailDomain || !validDomains.includes(emailDomain)) {
    alert('Please use a valid email from verified providers (Gmail, Hotmail, Outlook, etc.)');
    registerBtn.disabled = false;
    registerBtn.textContent = 'Register';
    return;
  }

  const registerBtn = document.getElementById('registerBtn');
  registerBtn.disabled = true;
  registerBtn.textContent = 'Registering...';

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });

    const data = await response.json();

    if (response.ok) {
      closeModal();
      // Show success message using YouJazz message system
      if (window.YouJazz && window.YouJazz.showMessage) {
        await YouJazz.showMessage(
          'Registration Successful!',
          `An activation email has been sent to ${email}. Please check your inbox and click the activation link to complete your registration.`,
          '✉'
        );
      } else {
        YouJazz.showMessage("YouJazz message", `Registration successful! An activation email has been sent to ${email}`);
      }
    } else {
      closeModal();
      YouJazz.showMessage("Error", data.message || 'Registration failed. Please try again.');
      registerBtn.disabled = false;
      registerBtn.textContent = 'Register';
    }
  } catch (err) {
    console.error('Registration error:', err);
    closeModal();
    YouJazz.showMessage("Error", "An error occurred during registration. Please try again.");
    registerBtn.disabled = false;
    registerBtn.textContent = 'Register';
  }
}

// Close modal when clicking outside
document.addEventListener('click', function (e) {
  const modal = document.getElementById('authModal');
  if (e.target === modal) {
    closeModal();
  }
});
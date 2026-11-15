(function () {
  const $ = id => document.getElementById(id);
  const errBox = $('authError');
  const showError = m => { errBox.textContent = m; errBox.hidden = false; };
  const clearError = () => { errBox.hidden = true; };

  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let d = {};
    try { d = await r.json(); } catch (e) { /* no body */ }
    if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
    return d;
  }
  const goHome = u => location.replace(u && u.role === 'ADMIN' ? '/admin.html' : '/');

  // Already logged in? Skip the form.
  fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(u => { if (u) goHome(u); }).catch(() => {});

  // Show / hide password
  document.querySelectorAll('.pw-toggle').forEach(b => b.addEventListener('click', () => {
    const input = $(b.dataset.pw);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Hide' : 'Show';
  }));

  // Is public sign up allowed?
  let signupEnabled = true;
  const configReady = fetch('/api/auth/config').then(r => r.json()).then(c => { signupEnabled = c.signupEnabled !== false; }).catch(() => {});

  const loginForm = $('loginForm');
  if (loginForm) {
    configReady.then(() => { $('switchLine').hidden = !signupEnabled; });
    loginForm.addEventListener('submit', async e => {
      e.preventDefault(); clearError();
      const username = $('username').value.trim(), password = $('password').value;
      if (!username || !password) { showError('Enter your username and password.'); return; }
      const btn = $('submitBtn'); btn.disabled = true; btn.textContent = 'Logging in...';
      try { goHome(await post('/api/auth/login', { username, password })); }
      catch (err) { showError(err.message); btn.disabled = false; btn.textContent = 'Log in'; }
    });
  }

  const signupForm = $('signupForm');
  if (signupForm) {
    configReady.then(() => {
      if (!signupEnabled) {
        showError('Sign up is turned off. Please ask the admin to create your account.');
        signupForm.querySelectorAll('input,button[type=submit]').forEach(el => el.disabled = true);
      }
    });
    signupForm.addEventListener('submit', async e => {
      e.preventDefault(); clearError();
      const fullName = $('fullName').value.trim(), username = $('username').value.trim().toLowerCase(),
        password = $('password').value, confirm = $('confirm').value;
      if (fullName.length < 2) { showError('Enter your full name.'); return; }
      if (!/^[a-z0-9_.]{3,30}$/.test(username)) { showError('Username must be 3 to 30 characters: letters, numbers, dot or underscore.'); return; }
      if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }
      if (password !== confirm) { showError('The two passwords do not match.'); return; }
      const btn = $('submitBtn'); btn.disabled = true; btn.textContent = 'Creating account...';
      try { goHome(await post('/api/auth/signup', { fullName, username, password })); }
      catch (err) { showError(err.message); btn.disabled = false; btn.textContent = 'Create account'; }
    });
  }
})();

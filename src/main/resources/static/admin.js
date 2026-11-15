const API = '/api/admin/users';
const byId = id => document.getElementById(id);
const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v || 0));
let users = [], me = null;

function notify(m) { const t = byId('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); }
async function request(url, options = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (r.status === 401) { location.href = '/login.html'; throw new Error('Session expired'); }
  if (r.status === 403 && !url.startsWith('/api/admin')) { location.href = '/'; throw new Error('Not allowed'); }
  let data = {};
  try { data = await r.json(); } catch (e) { /* no body */ }
  if (!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// ---------- theme ----------
function setTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); byId('themeBtn').textContent = t === 'dark' ? 'Light mode' : 'Dark mode'; }
byId('themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

// ---------- modals ----------
const open = id => { byId(id).hidden = false; };
const close = id => { byId(id).hidden = true; };
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(b.dataset.close)));
['createBackdrop', 'resetBackdrop'].forEach(id => byId(id).addEventListener('click', e => { if (e.target.id === id) close(id); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { close('createBackdrop'); close('resetBackdrop'); } });
function formError(id, msg) { const b = byId(id); b.textContent = msg || ''; b.hidden = !msg; }

// ---------- list ----------
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtDateTime = s => s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Never';

function visible() {
  const q = byId('userSearch').value.trim().toLowerCase(), st = byId('statusFilter').value;
  return users.filter(u => (!st || (st === 'on') === u.enabled) && `${u.fullName} ${u.username}`.toLowerCase().includes(q));
}
function render() {
  byId('statTotal').textContent = users.length;
  byId('statActive').textContent = users.filter(u => u.enabled).length;
  byId('statOff').textContent = users.filter(u => !u.enabled).length;
  const list = visible();
  byId('userRows').innerHTML = list.length ? list.map(u => {
    const self = me && u.id === me.id;
    return `<tr>
<td><div class="u-name">${safe(u.fullName)}${self ? ' <span class="you-tag">You</span>' : ''}</div><small class="u-handle">@${safe(u.username)}</small></td>
<td><span class="role-pill${u.role === 'ADMIN' ? ' admin' : ''}">${u.role === 'ADMIN' ? 'Admin' : 'User'}</span></td>
<td><label class="switch" title="${self ? 'You cannot turn off your own account' : (u.enabled ? 'Turn off' : 'Turn on')}"><input type="checkbox" data-toggle="${u.id}" ${u.enabled ? 'checked' : ''} ${self ? 'disabled' : ''} aria-label="Access for ${safe(u.fullName)}"><span></span></label><span class="access-text ${u.enabled ? 'on' : 'off'}">${u.enabled ? 'On' : 'Off'}</span></td>
<td>${u.expenseCount} <small class="u-handle">(${money(u.expenseTotal)})</small></td>
<td>${fmtDate(u.createdAt)}</td>
<td>${fmtDateTime(u.lastLoginAt)}</td>
<td>${self ? '' : `<button class="action-button" data-reset="${u.id}">Reset password</button><button class="action-button" data-role="${u.id}">${u.role === 'ADMIN' ? 'Make user' : 'Make admin'}</button><button class="action-button delete-button" data-delete="${u.id}">Delete</button>`}</td>
</tr>`;
  }).join('') : '<tr><td colspan="7" class="empty-state">No users found.</td></tr>';
}
async function load() {
  try { users = await request(API); render(); }
  catch (e) { byId('userRows').innerHTML = `<tr><td colspan="7" class="empty-state">${safe(e.message)}</td></tr>`; }
}
['userSearch', 'statusFilter'].forEach(id => byId(id).addEventListener(id === 'userSearch' ? 'input' : 'change', render));

// ---------- row actions ----------
const rows = byId('userRows');
rows.addEventListener('change', async e => {
  const id = e.target.dataset.toggle; if (!id) return;
  const on = e.target.checked;
  try { await request(`${API}/${id}/enabled`, { method: 'PUT', body: JSON.stringify({ enabled: on }) }); notify(on ? 'User turned on' : 'User turned off'); await load(); }
  catch (err) { e.target.checked = !on; notify(err.message); }
});
rows.addEventListener('click', async e => {
  const t = e.target, find = id => users.find(u => u.id === Number(id));
  if (t.dataset.reset) { const u = find(t.dataset.reset); if (!u) return; byId('resetId').value = u.id; byId('resetTitle').textContent = `Reset password for ${u.fullName}`; byId('resetPassword').value = ''; formError('resetError'); open('resetBackdrop'); byId('resetPassword').focus(); }
  if (t.dataset.role) {
    const u = find(t.dataset.role); if (!u) return; const next = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(next === 'ADMIN' ? `Make ${u.fullName} an admin? They will be able to manage all users.` : `Remove admin rights from ${u.fullName}?`)) return;
    try { await request(`${API}/${u.id}/role`, { method: 'PUT', body: JSON.stringify({ role: next }) }); notify('Role updated'); await load(); } catch (err) { notify(err.message); }
  }
  if (t.dataset.delete) {
    const u = find(t.dataset.delete); if (!u) return;
    if (!confirm(`Delete ${u.fullName} and all of their expenses, goals and subscriptions? This cannot be undone.\n\nTip: turn the switch off instead if you only want to block them.`)) return;
    try { await request(`${API}/${u.id}`, { method: 'DELETE' }); notify('User deleted'); await load(); } catch (err) { notify(err.message); }
  }
});

// ---------- create user ----------
byId('addUserBtn').onclick = () => { byId('createForm').reset(); formError('createError'); open('createBackdrop'); byId('newName').focus(); };
byId('createForm').addEventListener('submit', async e => {
  e.preventDefault(); formError('createError');
  const body = { fullName: byId('newName').value.trim(), username: byId('newUsername').value.trim().toLowerCase(), password: byId('newPassword').value, role: byId('newRole').value };
  try { await request(API, { method: 'POST', body: JSON.stringify(body) }); close('createBackdrop'); notify(`User ${body.username} created`); await load(); }
  catch (err) { formError('createError', err.message); }
});

// ---------- reset password ----------
byId('resetForm').addEventListener('submit', async e => {
  e.preventDefault(); formError('resetError');
  try { await request(`${API}/${byId('resetId').value}/password`, { method: 'PUT', body: JSON.stringify({ password: byId('resetPassword').value }) }); close('resetBackdrop'); notify('Password updated'); }
  catch (err) { formError('resetError', err.message); }
});

// ---------- logout / init ----------
byId('logoutBtn').onclick = () => { fetch('/api/auth/logout', { method: 'POST' }).finally(() => { location.href = '/login.html'; }); };
(async () => {
  setTheme(document.documentElement.dataset.theme || 'light');
  try {
    me = await request('/api/auth/me');
    byId('profName').textContent = me.fullName;
    byId('avatar').textContent = me.fullName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  } catch (e) { return; }
  load();
})();

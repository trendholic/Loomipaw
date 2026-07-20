/* Auth pages — login, register, forgot, reset. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const $ = (s) => document.querySelector(s);
  const alertBox = () => $('[data-auth-alert]');
  const showErr = (m) => { const a = alertBox(); if (a) a.innerHTML = `<div class="alert alert--error">${Loom.escapeHtml(m)}</div>`; };
  const showOk = (m) => { const a = alertBox(); if (a) a.innerHTML = `<div class="alert alert--ok">${Loom.escapeHtml(m)}</div>`; };
  const redirect = () => { const to = new URLSearchParams(location.search).get('redirect'); location.href = to && to.startsWith('/') ? to : '/account/'; };

  const login = $('[data-login-form]');
  if (login) login.addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(login);
    try { await API.login(fd.get('email'), fd.get('password')); redirect(); }
    catch (err) { showErr(err.message); }
  });

  const register = $('[data-register-form]');
  if (register) register.addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(register);
    try { await API.register(fd.get('name'), fd.get('email'), fd.get('password')); redirect(); }
    catch (err) { showErr(err.details ? err.details.map((d) => d.message).join(' ') : err.message); }
  });

  const forgot = $('[data-forgot-form]');
  if (forgot) forgot.addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(forgot);
    try { const r = await API.forgotPassword(fd.get('email')); showOk(r.message || 'Check your email for a reset link.'); forgot.reset(); }
    catch (err) { showErr(err.message); }
  });

  const reset = $('[data-reset-form]');
  if (reset) {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) showErr('Missing reset token. Please use the link from your email.');
    reset.addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(reset);
      try { await API.resetPassword(token, fd.get('password')); showOk('Password updated. Redirecting to login…'); setTimeout(() => location.href = '/account/login.html', 1200); }
      catch (err) { showErr(err.message); }
    });
  }

  // If already logged in on login/register, bounce to account.
  document.addEventListener('loom:ready', () => {
    if ((login || register) && Loom.isAuthed()) redirect();
  });
})();

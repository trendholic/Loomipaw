/* Contact form. */
(function () {
  'use strict';
  const API = window.LoomAPI;
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const alert = form.querySelector('[data-contact-alert]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const res = await API.contact({ name: fd.get('name'), email: fd.get('email'), subject: fd.get('subject'), message: fd.get('message') });
      form.reset();
      alert.innerHTML = `<div class="alert alert--ok">${Loom.escapeHtml(res.message || 'Thanks — we’ll be in touch.')}</div>`;
    } catch (err) {
      alert.innerHTML = `<div class="alert alert--error">${Loom.escapeHtml(err.message)}</div>`;
    } finally { btn.disabled = false; }
  });
})();

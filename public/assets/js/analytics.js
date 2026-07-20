/* =====================================================================
   Loomipaw analytics loader.
   Reads tag IDs from GET /api/settings (exposed as Loom.state.settings.
   analytics) and boots only the vendors that are configured. All snippets
   are implemented programmatically (no inline <script> strings) so the
   Content-Security-Policy stays free of 'unsafe-inline'. The server only
   allowlists a vendor's hosts when its ID is present, so an unconfigured
   store loads nothing and keeps a locked-down CSP.

   Standard ecommerce events are dispatched by Loom.track() (see main.js),
   which forwards to gtag / fbq / ttq when they exist. This file is purely
   the loader.
   ===================================================================== */
(function () {
  'use strict';

  function loadScript(src, attrs) {
    const s = document.createElement('script');
    s.async = true; s.src = src;
    if (attrs) Object.keys(attrs).forEach((k) => s.setAttribute(k, attrs[k]));
    document.head.appendChild(s);
    return s;
  }

  function initGA4(id) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // Respect built-in consent defaults; page_view fires automatically.
    window.gtag('config', id, { send_page_view: true });
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id));
  }

  function initMetaPixel(id) {
    if (window.fbq) return;
    const n = window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }

  function initTikTok(id) {
    window.TiktokAnalyticsObject = 'ttq';
    const ttq = window.ttq = window.ttq || [];
    const methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off',
      'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.methods = methods;
    ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat([].slice.call(arguments, 0))); }; };
    for (let i = 0; i < methods.length; i++) ttq.setAndDefer(ttq, methods[i]);
    ttq.load = function (e) {
      const url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = url;
      ttq._t = ttq._t || {}; ttq._t[e] = +new Date();
      ttq._o = ttq._o || {}; ttq._o[e] = {};
      loadScript(url + '?sdkid=' + encodeURIComponent(e) + '&lib=ttq');
    };
    ttq.load(id);
    ttq.page();
  }

  function initClarity(id) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    loadScript('https://www.clarity.ms/tag/' + encodeURIComponent(id));
  }

  function boot(settings) {
    const a = (settings && settings.analytics) || {};
    try { if (a.ga4) initGA4(a.ga4); } catch (e) { /* non-fatal */ }
    try { if (a.metaPixel) initMetaPixel(a.metaPixel); } catch (e) {}
    try { if (a.tiktokPixel) initTikTok(a.tiktokPixel); } catch (e) {}
    try { if (a.clarity) initClarity(a.clarity); } catch (e) {}
    document.dispatchEvent(new CustomEvent('loom:analytics-ready'));
  }

  // main.js dispatches loom:ready once settings are loaded.
  if (window.Loom && window.Loom.state && window.Loom.state.settings) {
    boot(window.Loom.state.settings);
  } else {
    document.addEventListener('loom:ready', (e) => boot(e.detail && e.detail.settings), { once: true });
  }
})();

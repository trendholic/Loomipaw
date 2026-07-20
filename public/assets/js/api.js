/* =====================================================================
   Loomipaw API client — single source of truth for all backend calls.
   Handles CSRF token, JSON, and error normalization.
   ===================================================================== */
(function () {
  'use strict';

  function getCookie(name) {
    return document.cookie.split('; ').find((c) => c.startsWith(name + '='))?.split('=')[1];
  }

  async function request(method, path, body, opts = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') {
      const csrf = getCookie('lp_csrf');
      if (csrf) headers['x-csrf-token'] = decodeURIComponent(csrf);
    }
    const res = await fetch('/api' + path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* empty body */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.details = data && data.details;
      err.data = data;
      throw err;
    }
    return data;
  }

  const API = {
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b === undefined ? {} : b),
    put: (p, b) => request('PUT', p, b),
    patch: (p, b) => request('PATCH', p, b),
    del: (p, b) => request('DELETE', p, b),
    upload: (p, formData) => request('POST', p, formData),

    // Convenience domains
    products: (query = '') => request('GET', '/products' + (query ? '?' + query : '')),
    product: (slug) => request('GET', '/products/' + encodeURIComponent(slug)),
    categories: () => request('GET', '/categories'),
    search: (q) => request('GET', '/search?q=' + encodeURIComponent(q)),
    settings: () => request('GET', '/settings'),

    cart: () => request('GET', '/cart'),
    addToCart: (variantId, qty) => request('POST', '/cart/items', { variantId, qty }),
    updateCartItem: (variantId, qty) => request('PATCH', '/cart/items/' + variantId, { qty }),
    removeCartItem: (variantId) => request('DELETE', '/cart/items/' + variantId),
    applyCoupon: (code) => request('POST', '/cart/coupon', { code }),
    removeCoupon: () => request('DELETE', '/cart/coupon'),
    checkout: (payload) => request('POST', '/checkout', payload),

    me: () => request('GET', '/auth/me'),
    login: (email, password) => request('POST', '/auth/login', { email, password }),
    register: (name, email, password) => request('POST', '/auth/register', { name, email, password }),
    logout: () => request('POST', '/auth/logout', {}),
    updateProfile: (data) => request('PATCH', '/auth/me', data),
    changePassword: (current, password) => request('POST', '/auth/change-password', { current, password }),
    forgotPassword: (email) => request('POST', '/auth/forgot-password', { email }),
    resetPassword: (token, password) => request('POST', '/auth/reset-password', { token, password }),

    orders: () => request('GET', '/orders'),
    order: (number, email) => request('GET', '/orders/' + encodeURIComponent(number) + (email ? '?email=' + encodeURIComponent(email) : '')),

    wishlist: () => request('GET', '/wishlist'),
    addWishlist: (productId) => request('POST', '/wishlist', { productId }),
    removeWishlist: (productId) => request('DELETE', '/wishlist/' + productId),

    reviews: (slug) => request('GET', '/reviews/product/' + encodeURIComponent(slug)),
    addReview: (slug, review) => request('POST', '/reviews/product/' + encodeURIComponent(slug), review),

    newsletter: (email) => request('POST', '/newsletter', { email }),
    contact: (payload) => request('POST', '/contact', payload),
  };

  window.LoomAPI = API;
})();

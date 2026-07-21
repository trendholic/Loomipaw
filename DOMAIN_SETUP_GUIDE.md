# Loomipaw — Domain Setup Guide

Connect your custom domain, enable HTTPS, and verify everything routes
correctly. Config only — no code changes. Prerequisite: the app is **already
deployed and reachable** (see `DEPLOYMENT_HOSTING_GUIDE.md`) — a domain can't
point at a server that isn't running.

Throughout, replace `your-domain.com` with your real domain and
`YOUR.SERVER.IP` with your server's public IP.

---

## 1. DNS records needed

### A) VPS (you have a server IP)
In your registrar's DNS panel:

| Type | Name / Host | Value | TTL |
|------|-------------|-------|-----|
| A | `@` (apex) | `YOUR.SERVER.IP` | 300 |
| A | `www` | `YOUR.SERVER.IP` | 300 |
| AAAA | `@` / `www` | your IPv6 (if any) | 300 |

### B) Render / Railway (you have a platform hostname, not an IP)
Add your custom domain **in the platform dashboard first** (Render: Settings →
Custom Domains; Railway: Settings → Domains). It gives you a target hostname —
then add:

| Type | Name / Host | Value | TTL |
|------|-------------|-------|-----|
| CNAME | `www` | `your-app.onrender.com` / `…up.railway.app` | 300 |
| ALIAS/ANAME (or CNAME-flattening) | `@` (apex) | same platform hostname | 300 |

> Apex (`@`) can't be a plain CNAME in classic DNS. Use your provider's
> **ALIAS/ANAME** record, or **Cloudflare** (which flattens CNAMEs at the apex).

Check propagation:
```bash
dig +short your-domain.com
dig +short www.your-domain.com
```

---

## 2. HTTPS / SSL setup

### VPS (nginx + certbot)
The repo's `deploy/nginx.conf` already has the HTTP→HTTPS redirect and `www`
handling — replace `loomipaw.com` in it with your domain, then:
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
Certbot installs the cert, wires it into nginx, and auto-renews. TLS 1.2/1.3 and
HSTS are already configured (the app also sends HSTS in production).

### Render / Railway
TLS is **automatic** — the platform provisions and renews the certificate once
DNS resolves to it. No certbot, nothing to configure.

### Cloudflare (if it's your DNS/proxy)
If the record is **proxied** (orange cloud), set **SSL/TLS mode → Full (strict)**.
"Flexible" causes a redirect loop with the app's HTTPS + HSTS. Or use **DNS-only**
(grey cloud) and let the origin (certbot/platform) handle TLS.

---

## 3. APP_URL configuration

Set this in the environment **to the exact public HTTPS origin** (no trailing
slash — the app strips one anyway):
```
APP_URL=https://your-domain.com
```
`APP_URL` drives canonical URLs, `sitemap.xml`, `robots.txt`, Open Graph tags,
and every link in transactional/marketing emails. If it's wrong, SEO and email
links point to the wrong place. Redeploy/restart after changing it.

Pick **one** canonical host (apex **or** `www`) and use it consistently in
`APP_URL`; redirect the other (next section).

---

## 4. Redirect verification

You want: HTTP → HTTPS, and the non-canonical host → canonical host, all via
**301**.

- **VPS:** `deploy/nginx.conf` already 301s HTTP→HTTPS. To force apex↔www, keep
  one `server_name` canonical and add a small redirect server block for the other
  (or handle it at Cloudflare with a redirect rule).
- **Render/Railway:** add both apex and `www` as custom domains and set the
  redirect to your primary in the dashboard.

Verify:
```bash
curl -sI http://your-domain.com        | grep -i location   # → https://your-domain.com/…
curl -sI https://www.your-domain.com   | grep -i location   # → https://your-domain.com/…  (if apex is canonical)
curl -sI https://your-domain.com/api/health                 # → HTTP/2 200
curl -sI https://your-domain.com | grep -i strict-transport # → strict-transport-security present
```

Checklist:
- [ ] `http://` → `https://` (301)
- [ ] non-canonical host → canonical host (301)
- [ ] `https://your-domain.com/api/health` → 200 `{ ok: true }`
- [ ] Padlock valid; cert covers apex **and** `www`
- [ ] HSTS header present
- [ ] Storefront + a product page load; images and `/api/*` work over HTTPS
- [ ] `APP_URL` matches the canonical host (check a product page's `<link rel="canonical">` and `sitemap.xml`)

---

## 5. What you must provide manually

I can't do these from here — they need your accounts:
1. **The domain** (registered) and access to its **DNS panel**.
2. **The server IP** (VPS) **or** the domain added in the **platform dashboard**
   (Render/Railway) to get the CNAME target.
3. Running **certbot** on the VPS (one command) — or nothing on Render/Railway
   (auto TLS).
4. Setting **`APP_URL`** in the environment and redeploying.

Once DNS resolves and TLS is green, continue with
`PRODUCTION_ACTIVATION_GUIDE.md` (payments, email on the new domain incl.
SPF/DKIM/DMARC, analytics, backups).

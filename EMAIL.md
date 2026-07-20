# Loomipaw — Email Production Readiness

Loomipaw sends transactional email through a provider-agnostic mailer
(`server/lib/mailer/`). In development it writes `.eml` files to `var/mail/`
(no delivery); in production it delivers via SMTP.

---

## Transactional emails (all implemented & verified)

| Email | Trigger | Template |
|-------|---------|----------|
| **Welcome** | new account registration | `templates.welcome` |
| **Password reset** | forgot-password request | `templates.passwordReset` |
| **Order confirmation** | successful checkout (to customer) | `templates.orderConfirmation` |
| **Admin new-order** | successful checkout (to store) | `templates.adminNewOrder` |
| **Shipping / status update** | admin changes order status (shipped, etc.) | `templates.orderStatus` |
| **Refund notification** | admin refunds an order | `templates.orderStatus` (refunded) |
| **Contact receipt** | contact form submission (to store) | `templates.contactAdmin` |

All templates are branded, inline-styled, responsive HTML with plain-text
fallbacks. Verified by `npm run test:email` (6/6 render & send).

---

## Testing

**Render every template** (dev transport → `var/mail/*.eml`, open in any client):
```bash
npm run test:email you@example.com
```

**Real delivery test** — set SMTP in `.env`, then:
```bash
MAIL_TRANSPORT=smtp npm run test:email you@example.com
```
Send to a Gmail + an Outlook address and check: inbox placement (not spam),
rendering, and the "signed-by" / "mailed-by" domain.

Use a seed/inbox-placement tool (e.g. mail-tester.com) — `npm run test:email
test-xxxx@mail-tester.com` — to get a spam score and confirm auth alignment.

---

## Choosing a provider

Any SMTP provider works via `MAIL_TRANSPORT=smtp` + `SMTP_*`:

| Provider | Host | Port | Notes |
|----------|------|------|-------|
| SendGrid | smtp.sendgrid.net | 587 | user = `apikey`, pass = API key |
| Postmark | smtp.postmarkapp.com | 587 | user/pass = server token |
| Amazon SES | email-smtp.<region>.amazonaws.com | 587 | SMTP credentials from SES |
| Mailgun | smtp.mailgun.org | 587 | domain SMTP creds |

Set `MAIL_FROM` to an address **on your domain** (e.g.
`"Loomipaw <orders@your-domain.com>"`) — required for DKIM/DMARC alignment.

---

## Deliverability: SPF, DKIM, DMARC

Configure these DNS records so mailbox providers trust your mail. Your ESP
gives you the exact values; the shapes are:

### 1. SPF (authorize senders) — TXT on the root domain
```
your-domain.com.  TXT  "v=spf1 include:<your-esp-spf> ~all"
# e.g. include:sendgrid.net  |  include:amazonses.com  |  include:spf.mtasv.net
```
Only **one** SPF record — merge includes if you use multiple senders.

### 2. DKIM (cryptographic signature) — CNAME/TXT records from your ESP
```
s1._domainkey.your-domain.com.  CNAME  s1.domainkey.u1234.<esp>.net.
s2._domainkey.your-domain.com.  CNAME  s2.domainkey.u1234.<esp>.net.
```
Enable DKIM/"domain authentication" in the ESP dashboard and add the records
it generates. This is what makes mail "signed-by your-domain.com".

### 3. DMARC (policy + reporting) — TXT on `_dmarc`
```
_dmarc.your-domain.com.  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@your-domain.com; fo=1"
```
Start at `p=none` (monitor), review the aggregate reports, then tighten to
`p=quarantine` and finally `p=reject` once SPF **and** DKIM pass and align.

### Verify
```bash
dig +short TXT your-domain.com          # SPF
dig +short TXT _dmarc.your-domain.com   # DMARC
dig +short CNAME s1._domainkey.your-domain.com   # DKIM
```
Then send a live test (above) and confirm the receiving headers show
`spf=pass`, `dkim=pass`, `dmarc=pass`.

---

## Notes

- Email sends are **non-blocking** and failures are logged, never breaking
  checkout or auth.
- Until SMTP is configured the app is fully functional; only delivery is
  deferred (messages accumulate in `var/mail/`).

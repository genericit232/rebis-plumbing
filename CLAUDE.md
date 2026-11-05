# Rebis Plumbing & Gas website: guide for Claude Code

This file tells you (Claude Code) how this project works and how to take it from this package to a live site.
When the user asks to "set it up", "launch it" or "deploy it", follow **Launch runbook** in order and tick steps off with the user.

## What this is

- **Site:** a single static page in `site/` (HTML/CSS/JS all inline in `site/index.html`, no build step).
  It's published to **GitHub Pages** by `.github/workflows/pages.yml` on every push to `main`.
- **Callback form:** posts to a **Cloudflare Worker** (`worker/`), which validates it and emails the owner via **Resend**.
  The Resend API key lives only in the Worker as a secret. It must never appear in `site/`.
- Business: Rebis Plumbing & Gas, a plumber and gas fitter servicing Brisbane and the Redlands, QLD, Australia. Phone 0467 505 883.
  Instagram https://www.instagram.com/rebisplumbing/ and Facebook https://www.facebook.com/profile.php?id=61585906181825

```
site/                 published as the website
  index.html          the whole page
  404.html, favicon.svg, apple-touch-icon.png, robots.txt, sitemap.xml, .nojekyll
  images/             placeholders now; real photos go here via `npm run images`
worker/               Cloudflare Worker: form -> Resend email
  src/index.js        handler (validation, CORS, spam traps, email template)
  test/               node:test suite with mocked Resend (`npm test`)
  wrangler.toml       non-secret config (TO_EMAIL, FROM_EMAIL, ALLOWED_ORIGINS)
  .dev.vars.example   local dev config template
brand/logo.jpg        source logo; `npm run logo` rebuilds the web icons from it
scripts/check.sh      pre-launch check: lists every placeholder left (`npm run check`)
scripts/optimize-images.mjs   photos-raw/* -> site/images/*.jpg resized and compressed (`npm run images`)
photos-raw/           drop original photos here (git-ignored), see its README for slot names
.github/workflows/pages.yml   GitHub Pages deploy
```

## Ground rules

- **Never invent business facts.** That includes reviews, ratings, review counts, prices, years in business, awards, guarantees, opening hours, licence numbers and staff names.
  Ask the user, or leave the section out. The review cards are placeholders: fill them with real reviews (with permission) or delete `<section id="reviews">` and its nav link.
- Keep `site/index.html` a single self-contained file with no frameworks or build tools. It's meant to stay simple to edit.
- **Don't rename the form fields** `name, phone, suburb, job, details, company, t`. The worker depends on them.
  `company` is a hidden honeypot and `t` is the page-load timestamp used as a spam timer.
- Don't commit secrets. `.dev.vars` is git-ignored. Set `RESEND_API_KEY` only with `npx wrangler secret put`.
- Images in `site/images/` should stay under ~300 KB each. Use `npm run images`, which also strips GPS/EXIF data.
- After any change, run `npm run check` (from the root) and `cd worker && npm test`.
- The user is in Australia (QLD, AEST, no daylight saving). Use Australian spelling and +61 phone format.

## Current status (2026-11-04)

Filled in: domain `jamesrebis.com` (GoDaddy DNS, Google Workspace mail on the root MX; parked A records still on the root),
owner name **James**, leads go to `james@jamesrebis.com`, FROM is `website@jamesrebis.com`.

Brand: the real logo is `brand/logo.jpg`. `npm run logo` (scripts/build-logo.mjs) generates `site/images/logo-flame.png`
(header/footer mark), `site/favicon.png`, `site/apple-touch-icon.png` and `site/images/og.jpg` from it.

Photos: all real, from James's Instagram (originals in `photos-raw/original/`). Water meters = hero, filtration = cta,
favourite bathroom = about (also in the gallery). Gallery `work-1..6` captions are James's own Instagram captions, **verbatim**
(including "tenancy’s" and "Wolfdene"); don't "fix" them without asking. Service cards use inline SVG icons instead of photos.
Service areas: **Brisbane and the Redlands only**, kept high level (no suburb lists). Logan was dropped on purpose.

Accounts (all on the project Gmail, separate from the developer's personal accounts):
- GitHub `genericit232`, repo https://github.com/genericit232/rebis-plumbing, live at https://genericit232.github.io/rebis-plumbing/.
  This repo's git credential helper pulls `gh auth token --user genericit232`, so pushes work whichever gh account is active.
  For gh commands use `GH_TOKEN=$(gh auth token --user genericit232) gh ... -R genericit232/rebis-plumbing`.
- Resend: key in `worker/.dev.vars` (git-ignored). Until jamesrebis.com is verified, sending only reaches the project Gmail (the Resend sign-up address).
- Cloudflare: token + account id go in `worker/.env` (git-ignored; wrangler reads it).

Worker: deployed at https://rebis-callback.rebis-callback.workers.dev (Cloudflare account 9cff4ce20432e94be6dfbe65d9981ebf).
Email: jamesrebis.com is verified in Resend (DKIM + `send` subdomain at GoDaddy). Live config is exactly wrangler.toml:
website@jamesrebis.com -> james@jamesrebis.com. To test without emailing James: `npx wrangler deploy --var "TO_EMAIL:<project gmail>"`,
submit, then a plain `npx wrangler deploy` to restore.

GitHub Pages deploys through Actions: if the custom domain setting is ever changed, re-run the deploy
(`GH_TOKEN=$(gh auth token --user genericit232) gh workflow run pages.yml -R genericit232/rebis-plumbing`), otherwise
browsers get "Site not found" for a few minutes or longer.

Google Business Profile lists jamesrebis.com as the website, Mount Cotton QLD, 5.0 rating:
https://maps.google.com/?cid=6925511879385534287 (review text needs a signed-in browser to read).
Reviews: only real ones, verbatim. Currently one Facebook recommendation (Erin M., 29 Sep 2026).

Still to do:
- [x] QBCC 15578385 in footer
- [ ] Add Google reviews (verbatim) when they can be read from a signed-in session
- [ ] Resend: add `jamesrebis.com` domain, add its DNS records at GoDaddy, create a sending key (runbook step 3)
- [x] Cloudflare worker deployed, secret set, form action points at it
- [x] GitHub repo + Pages
- [x] Custom domain jamesrebis.com live with HTTPS
- [x] Resend domain verified; leads go to james@jamesrebis.com
- [ ] Confirm page claims with James (runbook step 0 item 10)

## Launch runbook

### 0. Gather everything from the user first (ask in one message)

1. **Domain name** and **where its DNS is managed** (e.g. VentraIP, Crazy Domains, GoDaddy, Cloudflare). If they don't know, run `whois <domain>` / `dig NS <domain>`.
2. **Owner email** that should receive callback requests.
3. **Owner first name** (for "Meet the plumber").
4. **QBCC licence number.**
5. **GitHub username** and repo name (suggest `rebis-plumbing`). Is `gh` installed and logged in (`gh auth status`)?
6. **Resend account:** do they have one and an API key? (They've used Resend before.)
7. **Cloudflare account** (free) for the Worker. `npx wrangler login` will open a browser.
8. **Photos:** where they are. They go in `photos-raw/` named by slot.
9. **Reviews:** real ones to paste in, or remove the section.
10. Confirm the claims on the page are true for him: residential *and* commercial, heat pump / continuous-flow hot water,
    "shoe covers and drop sheets", "Taking bookings" badge, FAQ answers. Edit or remove anything that isn't.

### 1. Fill placeholders

| Token | Replace with | Where |
|---|---|---|
| `YOURDOMAIN.com.au` | the real domain, e.g. `rebisplumbing.com.au` | site/index.html, robots.txt, sitemap.xml, worker/wrangler.toml |
| `OWNER@EMAIL` | owner's inbox | worker/wrangler.toml `TO_EMAIL` |
| `GITHUB-USER` | GitHub username (lowercase) | worker/wrangler.toml `ALLOWED_ORIGINS` |
| `rebis-callback.YOUR-SUBDOMAIN.workers.dev` | Worker URL from step 5 | site/index.html `<form action>` |
| `[Owner name]` | first name | site/index.html |
| `QBCC 0000000` | `QBCC <number>` | site/index.html footer |

If the domain isn't `.com.au`, replace the whole `YOURDOMAIN.com.au` string. `npm run check` lists anything left.

### 2. Photos and reviews

- Copy photos into `photos-raw/` named after the slots in `photos-raw/README.md` (e.g. `hero.jpg`, `work-1.heic`), then run `npm install && npm run images`.
- Check each photo looks right in its slot with `npm run preview`. The hero's left side is darkened for the text, so the subject should sit right of centre.
- Reviews: replace each `<blockquote class="placeholder">` with the review text (remove `class="placeholder"`). Use the reviewer's first name and suburb, and the first letter as the avatar.
  If none, delete the reviews section and the "Reviews" nav link.

### 3. Resend (sending domain)

1. In Resend, go to **Domains > Add domain**. Add the site's domain and pick the closest region.
2. Add the DNS records Resend shows (a DKIM TXT record, plus MX/TXT SPF records on the `send` subdomain) at the DNS host from step 0.
   These don't touch the domain's existing email (root MX records). Wait for **Verified**.
   Recommended: also add TXT `_dmarc` = `v=DMARC1; p=none;` if there's no DMARC record yet.
3. Create an **API key** with *Sending access* restricted to that domain.
4. `FROM_EMAIL` in wrangler.toml should be `Rebis Website <website@THEDOMAIN>`.

Testing before the domain verifies: use `FROM_EMAIL=Rebis Website <onboarding@resend.dev>` in `.dev.vars`.
It only delivers to the email the Resend account is registered with.

### 4. Local test (optional but recommended)

```bash
cp worker/.dev.vars.example worker/.dev.vars    # fill in the real key + emails
(cd worker && npm install && npm run dev)       # worker on http://localhost:8787
npm run preview                                 # site on http://localhost:8000 (second terminal)
```
On localhost the page automatically posts to `http://localhost:8787`. Submit the form and an email should arrive.

### 5. Deploy the Worker

```bash
cd worker
npm install
npm test
npx wrangler login
npx wrangler secret put RESEND_API_KEY      # paste the key when prompted
npx wrangler deploy                         # prints https://rebis-callback.<subdomain>.workers.dev
curl https://rebis-callback.<subdomain>.workers.dev/health    # {"ok":true}
```
Put that URL in the `<form action="...">` in `site/index.html`.
The first deploy may ask the user to pick a workers.dev subdomain.

Real end-to-end test (sends an actual email):
```bash
curl -i -X POST https://rebis-callback.<subdomain>.workers.dev \
  -H "Origin: https://THEDOMAIN" -H "Accept: application/json" \
  -F name="Test from Claude Code" -F phone="0412 345 678" -F suburb="Cleveland" -F job="Other" -F details="Ignore, test"
```

### 6. GitHub repo and Pages

```bash
git init -b main
git add .
git commit -m "Rebis Plumbing & Gas website"
gh repo create <repo> --public --source=. --push
gh api -X POST repos/<user>/<repo>/pages -f build_type=workflow
gh run watch      # wait for "Deploy site to GitHub Pages"
```
- The free GitHub plan only serves Pages from **public** repos. That's fine here: no secrets are in the repo.
- If the Pages API call fails because the workflow already ran, set it in the repo under Settings > Pages > Source = GitHub Actions, then re-run the workflow (`gh workflow run pages.yml`).
- The site will be at `https://<user>.github.io/<repo>/` until the domain is attached.
  `404.html` uses root paths, so it only looks right once the custom domain is live. That's expected.

### 7. Custom domain

1. At the DNS host, add these records (remove any parking/registrar A records on the root first):
   - `A` @ → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` @ → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` www → `<user>.github.io`
2. `gh api -X PUT repos/<user>/<repo>/pages -f cname=<domain>` (apex as primary; GitHub redirects www to it).
3. Recommended: verify the domain under GitHub *Settings > Pages > Verified domains* (adds a TXT record). This prevents domain takeover.
4. Check with `dig +short <domain>` and `gh api repos/<user>/<repo>/pages`. Once the certificate is issued (minutes to an hour or so):
   `gh api -X PUT repos/<user>/<repo>/pages -F https_enforced=true`

### 8. Launch checks

- [ ] `npm run check` prints **READY TO LAUNCH**
- [ ] Live site loads on `https://<domain>` and `https://www.<domain>`, with a padlock
- [ ] Submit the form on the **live** site from a phone, and the email arrives (check spam; mark "not spam" once)
- [ ] Tap-to-call and "Text it to us" work on a phone
- [ ] Mobile bottom bar shows and doesn't cover the footer
- [ ] Optional: `npx lighthouse https://<domain> --view` (aim for 90+ on performance, SEO and accessibility)
- [ ] Google Search Console: add the domain, submit `https://<domain>/sitemap.xml`
- [ ] Add the website link to his Google Business Profile, Instagram bio and Facebook page

## Making changes later

- **Site content:** edit `site/index.html`, then `git commit` and `git push`. It goes live in about a minute.
- **Who gets the leads:** edit `TO_EMAIL` in `worker/wrangler.toml` (comma-separate several addresses), then `cd worker && npx wrangler deploy`.
- **Worker code:** `cd worker && npm test && npx wrangler deploy`
- **Live worker logs:** `cd worker && npx wrangler tail`
- **New service:** copy an `<article class="svc">` block (pick or add an icon `<symbol>`), and add a matching `<option>` in the form's `job` select.

## Troubleshooting the form

The page shows "Something went wrong" when the worker returns an error. Check the browser devtools Network tab, or run `npx wrangler tail`:
- **403:** the page's origin isn't in `ALLOWED_ORIGINS`. It must match exactly: `https://`, no trailing slash, both apex and `www`.
- **500 "not configured":** the `RESEND_API_KEY` secret or `TO_EMAIL`/`FROM_EMAIL` is missing. Redeploy after fixing.
- **502:** Resend rejected the send (the reason is in `wrangler tail`). Usually the FROM domain isn't verified, or `onboarding@resend.dev` was used to send to a non-account address.
- **Emails landing in spam:** confirm DKIM/SPF are verified in Resend, add DMARC, and have the owner mark the first one "not spam".
- **Spam submissions getting through:** add Cloudflare Turnstile (free): a widget in the form, plus a token check in the worker against `https://challenges.cloudflare.com/turnstile/v0/siteverify`, with the secret stored via `wrangler secret put TURNSTILE_SECRET`.

## Optional upgrades (only if asked)

- If DNS moves to Cloudflare: serve the worker at `https://<domain>/api/callback` with a route, and drop CORS.
- Auto-deploy the worker from GitHub Actions with `cloudflare/wrangler-action` and a `CLOUDFLARE_API_TOKEN` secret.
- SMS alert to the owner alongside the email.

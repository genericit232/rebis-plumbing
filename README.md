# Rebis Plumbing & Gas: website

One-page website for Rebis Plumbing & Gas (Brisbane & the Redlands, QLD), with a working callback form.

- **Site:** `site/`, plain HTML, hosted free on GitHub Pages
- **Callback form:** a free Cloudflare Worker (`worker/`) emails each request to the owner via Resend

## Fastest way to launch

Open this folder in Claude Code and say:

> Read CLAUDE.md and walk me through launching the site.

It will ask for the domain, owner email, photos and so on, then do the setup with you.
The full runbook is in [CLAUDE.md](CLAUDE.md) if you'd rather do it by hand.

## What you'll need

- The domain login (to add DNS records)
- A GitHub account (`gh` CLI is handy)
- A Resend account and API key
- A free Cloudflare account (for the form worker)
- Node 18+ (and Python 3 for the local preview)
- His photos and, ideally, a few real reviews

## Everyday commands

| Command | What it does |
|---|---|
| `npm run preview` | Site on http://localhost:8000 |
| `npm run check` | Lists every placeholder still to fill. Says READY TO LAUNCH when done |
| `npm install && npm run images` | Resizes photos from `photos-raw/` into `site/images/` |
| `cd worker && npm test` | Tests the form handler (no accounts needed) |
| `cd worker && npm run dev` | Form handler on http://localhost:8787 (needs `worker/.dev.vars`) |
| `cd worker && npx wrangler deploy` | Deploys the form handler |
| `git push` | Publishes the site (GitHub Actions deploys `site/`) |

## How the form works

```
visitor fills form ──POST──▶ Cloudflare Worker ──API──▶ Resend ──email──▶ owner's inbox
 (site/index.html)            (worker/src/index.js)
```
The Worker checks the request came from the real site, validates the name and phone,
filters bots (hidden honeypot field plus a minimum fill time), and sends a formatted email
with a tap-to-call button. The Resend key is stored as a Worker secret, never in the website.

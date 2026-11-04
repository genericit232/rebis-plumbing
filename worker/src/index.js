/**
 * Rebis Plumbing & Gas - callback form handler.
 *
 * Receives the website's callback form (multipart or urlencoded POST) and emails it to the
 * owner via Resend. Runs as a Cloudflare Worker so the Resend API key never reaches the browser.
 *
 * Config (wrangler.toml [vars], overridden locally by .dev.vars):
 *   TO_EMAIL         owner's inbox (comma-separate for several)
 *   FROM_EMAIL       sender on a domain verified in Resend, e.g. "Rebis Website <website@example.com.au>"
 *   ALLOWED_ORIGINS  comma-separated site origins allowed to post, e.g. "https://example.com.au,https://www.example.com.au"
 * Secret (wrangler secret put RESEND_API_KEY):
 *   RESEND_API_KEY
 */

const LIMITS = { name: 100, phone: 30, suburb: 100, job: 60, details: 2000 };
const MIN_FILL_MS = 3000; // faster than this = a bot

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = list(env.ALLOWED_ORIGINS);
    const originOk = allowed.includes(origin);
    const cors = originOk
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        }
      : { Vary: 'Origin' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true }, 200, cors);
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405, cors);
    }

    const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
    const reply = (status, ok, message) =>
      wantsJson
        ? json(ok ? { ok: true } : { ok: false, error: message }, status, cors)
        : html(resultPage(ok, message, originOk ? origin : allowed[0] || '/'), status, cors);

    if (!originOk) return reply(403, false, 'This form can only be sent from the website.');

    let data;
    try {
      const ct = request.headers.get('Content-Type') || '';
      data = ct.includes('application/json')
        ? await request.json()
        : Object.fromEntries(await request.formData());
    } catch {
      return reply(400, false, 'Could not read the form.');
    }

    // Spam traps: hidden "company" field must be empty; form must not be submitted instantly.
    // Bots get a fake success so they don't retry.
    if (clean(data.company, 200)) return reply(200, true);
    const t = Number(data.t);
    if (t && Date.now() - t < MIN_FILL_MS) return reply(200, true);

    const lead = {
      name: clean(data.name, LIMITS.name),
      phone: clean(data.phone, LIMITS.phone),
      suburb: clean(data.suburb, LIMITS.suburb),
      job: clean(data.job, LIMITS.job) || 'Not specified',
      details: clean(data.details, LIMITS.details, true),
    };

    if (!lead.name) return reply(400, false, 'Please enter your name.');
    const digits = lead.phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return reply(400, false, 'Please enter a valid phone number.');

    if (!env.RESEND_API_KEY || !env.TO_EMAIL || !env.FROM_EMAIL) {
      console.error('Missing RESEND_API_KEY, TO_EMAIL or FROM_EMAIL');
      return reply(500, false, 'The form is not configured yet. Please call instead.');
    }

    const email = buildEmail(lead);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: list(env.TO_EMAIL),
        subject: `Callback request: ${lead.name} - ${lead.job}${lead.suburb ? ` (${lead.suburb})` : ''}`,
        html: email.html,
        text: email.text,
      }),
    });

    if (!res.ok) {
      console.error('Resend error', res.status, await res.text().catch(() => ''));
      return reply(502, false, 'Sorry, that did not send. Please call us instead.');
    }
    return reply(200, true);
  },
};

// ---------- helpers ----------

function list(v) {
  return String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function clean(v, max, multiline = false) {
  if (typeof v !== 'string') return '';
  let s = v.replace(/\r\n?/g, '\n');
  s = multiline ? s.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  return s.trim().slice(0, max);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function html(body, status, headers) {
  return new Response(body, { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
}

function buildEmail(lead) {
  const when = new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Brisbane', dateStyle: 'medium', timeStyle: 'short',
  });
  const tel = lead.phone.replace(/[^\d+]/g, '');
  const rows = [
    ['Name', esc(lead.name)],
    ['Phone', `<a href="tel:${esc(tel)}" style="color:#0d2340;font-weight:700">${esc(lead.phone)}</a>`],
    ['Suburb', esc(lead.suburb || '-')],
    ['Job', esc(lead.job)],
    ['Details', lead.details ? esc(lead.details).replace(/\n/g, '<br>') : '-'],
    ['Received', esc(when)],
  ];
  const htmlBody = `<!doctype html><html><body style="margin:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#18222f">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#0d2340;color:#fff;padding:18px 22px;border-radius:8px 8px 0 0">
    <div style="font-size:12px;letter-spacing:2px;color:#f47b20;font-weight:700">REBIS WEBSITE</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px">New callback request</div>
  </div>
  <div style="background:#fff;padding:22px;border-radius:0 0 8px 8px">
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${rows.map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;color:#5c6878;width:90px;vertical-align:top;border-bottom:1px solid #e2e7ee">${k}</td><td style="padding:9px 0;border-bottom:1px solid #e2e7ee">${v}</td></tr>`).join('')}
    </table>
    <a href="tel:${esc(tel)}" style="display:block;margin-top:22px;background:#f47b20;color:#fff;text-align:center;text-decoration:none;font-weight:700;padding:14px;border-radius:6px;font-size:16px">Call ${esc(lead.name)} now</a>
  </div>
</div></body></html>`;
  const text = [
    'New callback request from the Rebis website',
    '',
    `Name:    ${lead.name}`,
    `Phone:   ${lead.phone}`,
    `Suburb:  ${lead.suburb || '-'}`,
    `Job:     ${lead.job}`,
    `Details: ${lead.details || '-'}`,
    `Received: ${when}`,
  ].join('\n');
  return { html: htmlBody, text };
}

function resultPage(ok, message, backTo) {
  const title = ok ? 'Thanks!' : 'Something went wrong';
  const msg = ok ? "We've got your details and will call you back soon." : esc(message || 'Please try again.');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | Rebis Plumbing &amp; Gas</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;font-family:system-ui,sans-serif;background:#0d2340;color:#fff;padding:24px}
h1{font-size:2.4rem;margin:0 0 10px;text-transform:uppercase}p{color:rgba(255,255,255,.8);margin:0 0 26px;font-size:1.1rem}
a{display:inline-block;margin:6px;padding:14px 22px;border-radius:6px;text-decoration:none;font-weight:600;color:#fff}
.a{background:#f47b20}.b{box-shadow:inset 0 0 0 2px rgba(255,255,255,.7)}</style></head>
<body><div><h1>${title}</h1><p>${msg}</p><a class="a" href="${esc(backTo)}">Back to the website</a><a class="b" href="tel:+61467505883">Call 0467 505 883</a></div></body></html>`;
}

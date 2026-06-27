const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Use Railway volume if available, otherwise fall back to app directory
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const RSVP_FILE = path.join(DATA_DIR, 'rsvps.json');

console.log(`[STARTUP] DATA_DIR: ${DATA_DIR}`);
console.log(`[STARTUP] RSVP_FILE: ${RSVP_FILE}`);

// Ensure rsvps.json exists
function readRSVPs() {
  try {
    if (!fs.existsSync(RSVP_FILE)) {
      fs.writeFileSync(RSVP_FILE, '[]', 'utf8');
      console.log(`[INIT] Created new rsvps.json at ${RSVP_FILE}`);
    }
    return JSON.parse(fs.readFileSync(RSVP_FILE, 'utf8'));
  } catch (err) {
    console.error(`[ERROR] readRSVPs: ${err.message}`);
    return [];
  }
}

function writeRSVPs(data) {
  try {
    fs.writeFileSync(RSVP_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[WRITE] Saved ${data.length} RSVPs to ${RSVP_FILE}`);
    return true;
  } catch (err) {
    console.error(`[ERROR] writeRSVPs: ${err.message}`);
    return false;
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Health check ──
app.get('/health', (req, res) => {
  const rsvps = readRSVPs();
  res.json({
    ok: true,
    dataDir: DATA_DIR,
    rsvpFile: RSVP_FILE,
    fileExists: fs.existsSync(RSVP_FILE),
    count: rsvps.length
  });
});

// ── RSVP submission ──
app.post('/rsvp', (req, res) => {
  const { fname, lname, guests, appetizer, allergies } = req.body;
  if (!fname || !lname) return res.status(400).json({ error: 'Name required' });

  const rsvps = readRSVPs();
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    fname: fname.trim(),
    lname: lname.trim(),
    guests: parseInt(guests) || 1,
    appetizer: appetizer?.trim() || '',
    allergies: allergies?.trim() || ''
  };

  rsvps.push(entry);
  const saved = writeRSVPs(rsvps);
  console.log(`[RSVP] ${entry.fname} ${entry.lname} — ${entry.guests} guest(s) — saved: ${saved}`);
  res.json({ ok: true, saved });
});

// ── Public RSVP list ──
app.get('/rsvps', (req, res) => {
  const rsvps = readRSVPs();
  console.log(`[GET /rsvps] Returning ${rsvps.length} entries`);
  const public_list = rsvps.map(r => ({
    name: `${r.fname} ${r.lname}`,
    guests: r.guests
  }));
  res.json(public_list);
});

// ── Admin page ──
app.get('/admin', (req, res) => {
  const rsvps = readRSVPs();
  const totalPeople = rsvps.reduce((sum, r) => sum + r.guests, 0);
  const appetizers = rsvps.filter(r => r.appetizer);

  const rows = rsvps.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.fname} ${r.lname}</strong></td>
      <td>${r.guests}</td>
      <td>${r.appetizer || '<span class="none">—</span>'}</td>
      <td>${r.allergies || '<span class="none">—</span>'}</td>
      <td class="ts">${new Date(r.timestamp).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
    </tr>`).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RSVP List · Cabin Night</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #0D2B3E; color: #E8DCC8; padding: 2rem 1.5rem; }
    h1 { font-size: 1.6rem; color: #fff; margin-bottom: 0.25rem; }
    .sub { color: #9AB5C4; font-size: 0.85rem; margin-bottom: 2rem; }
    .stats { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 2rem; }
    .stat { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 1rem 1.5rem; }
    .stat-num { font-size: 2rem; font-weight: 700; color: #F4A623; line-height: 1; }
    .stat-label { font-size: 0.75rem; color: #9AB5C4; margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.1em; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; padding: 0.65rem 1rem; font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: #F4A623; border-bottom: 1px solid rgba(255,255,255,0.12); }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.03); }
    .none { color: #9AB5C4; }
    .ts { color: #9AB5C4; font-size: 0.8rem; white-space: nowrap; }
    .empty { text-align: center; padding: 3rem; color: #9AB5C4; }
    .refresh { display: inline-block; margin-top: 1.5rem; font-size: 0.75rem; color: #9AB5C4; text-decoration: none; }
    .refresh:hover { color: #F4A623; }
    .debug { margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 0.75rem; color: #9AB5C4; }
  </style>
</head>
<body>
  <h1>🦞 RSVP List</h1>
  <p class="sub">Cabin Night · Thursday July 9, 2026 · 4:00 PM</p>
  <div class="stats">
    <div class="stat"><div class="stat-num">${rsvps.length}</div><div class="stat-label">RSVPs</div></div>
    <div class="stat"><div class="stat-num">${totalPeople}</div><div class="stat-label">Total People</div></div>
    <div class="stat"><div class="stat-num">${appetizers.length}</div><div class="stat-label">Appetizers</div></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>#</th><th>Name</th><th>People</th><th>Appetizer</th><th>Dietary Notes</th><th>RSVP'd</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">No RSVPs yet — share the link!</td></tr>'}</tbody>
    </table>
  </div>
  <a class="refresh" href="/admin">↻ Refresh</a>
  <div class="debug">📁 Data dir: ${DATA_DIR} · File: ${RSVP_FILE} · Exists: ${fs.existsSync(RSVP_FILE)}</div>
</body>
</html>`);
});

// ── Calendar ──
app.get('/calendar.ics', (req, res) => {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cabin Night//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:cabin-night-2026@seafoodextravaganza',
    'DTSTAMP:20260601T000000Z',
    'DTSTART:20260709T220000Z',
    'DTEND:20260710T020000Z',
    'SUMMARY:Cabin Night – Oysters / Shrimp / Cocktails',
    'DESCRIPTION:Bill Heinlein\'s Cabin Night during Member/Guest Week.\\nBYOB · Bring your wife · Appetizer to share optional.',
    'LOCATION:5056 S. Perry Park Road\\, Sedalia\\, CO 80135',
    'URL:https://cabin-seafood-night-production.up.railway.app',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  res.setHeader('Content-Type', 'text/calendar;charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="cabin-night.ics"');
  res.send(ics);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Cabin Night running on port ${PORT}`);
  console.log(`Data dir: ${DATA_DIR}`);
  console.log(`RSVP file: ${RSVP_FILE}`);
  readRSVPs(); // initialize file on startup
});

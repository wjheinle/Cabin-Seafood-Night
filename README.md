# The Seafood Extravaganza 🦞

Event site for Bill's Member-Guest Week Seafood Extravaganza — July 9 at the cabin.

## Local Dev

```bash
npm install
npm start
# → http://localhost:3000
```

## Deploy to Railway

1. Push this repo to GitHub
2. In Railway: **New Project → Deploy from GitHub repo**
3. Select this repo — Railway auto-detects Node.js
4. Set `PORT` env var if needed (Railway injects it automatically)
5. Deploy → live in ~60 seconds

## Customization

- **Menu items** — edit the `.menu-card` blocks in `public/index.html`
- **Details** (time, exact address) — update the `.details-grid` section
- **RSVP persistence** — wire up `POST /rsvp` in `server.js` to Airtable, Notion, or email as desired

## RSVP Backend (optional upgrade)

Currently RSVPs just log to console. To save them, add to `server.js`:

```js
// Example: write to a JSON file
const fs = require('fs');
app.post('/rsvp', (req, res) => {
  const rsvps = JSON.parse(fs.readFileSync('rsvps.json', 'utf8') || '[]');
  rsvps.push({ ...req.body, timestamp: new Date().toISOString() });
  fs.writeFileSync('rsvps.json', JSON.stringify(rsvps, null, 2));
  res.json({ ok: true });
});
```

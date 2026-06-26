const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// RSVP endpoint — log to console for now, easy to wire up to a DB or email later
app.post('/rsvp', (req, res) => {
  const { fname, lname, guests, allergies } = req.body;
  console.log(`[RSVP] ${fname} ${lname} — ${guests} guest(s). Notes: ${allergies || 'none'}`);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Seafood Extravaganza running on port ${PORT}`);
});

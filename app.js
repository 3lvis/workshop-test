const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');

// Use an in‑memory database for simplicity
const db = new Database(':memory:');

// Create tables
db.exec(`
  CREATE TABLE workshops (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    seats INTEGER NOT NULL
  );
  CREATE TABLE participants (
    id TEXT PRIMARY KEY,
    workshop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL
  );
`);

const app = express();
app.use(express.json());

// Create a new workshop
app.post('/workshops', (req, res) => {
  const { title, seats } = req.body;
  if (!title || !seats || seats <= 0) return res.status(400).json({ error: 'Invalid data' });
  
  const id = uuidv4();
  db.prepare(`INSERT INTO workshops (id, title, seats) VALUES (?, ?, ?)`)
    .run(id, title, seats);
  res.status(201).json({ id, title, seats });
});

// Register a participant (or add to waitlist if full)
app.post('/workshops/:id/register', (req, res) => {
  const workshop = db.prepare(`SELECT * FROM workshops WHERE id = ?`).get(req.params.id);
  if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
  
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  
  // Check if the participant is already registered
  const exists = db.prepare(`SELECT * FROM participants WHERE workshop_id = ? AND email = ?`)
    .get(workshop.id, email);
  if (exists) return res.status(400).json({ error: 'Already registered' });
  
  // Count confirmed participants
  const count = db.prepare(`
    SELECT COUNT(*) AS count 
    FROM participants 
    WHERE workshop_id = ? AND status = 'registered'
  `).get(workshop.id).count;
  
  const status = count < workshop.seats ? 'registered' : 'waitlist';
  db.prepare(`
    INSERT INTO participants (id, workshop_id, name, email, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), workshop.id, name, email, status);
  
  res.status(201).json({ status });
});

// Cancel a participant's registration
app.post('/workshops/:id/cancel', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  
  const participant = db.prepare(`
    SELECT * FROM participants 
    WHERE workshop_id = ? AND email = ?
  `).get(req.params.id, email);
  if (!participant) return res.status(404).json({ error: 'Participant not found' });
  
  db.prepare(`DELETE FROM participants WHERE id = ?`).run(participant.id);
  
  // If a confirmed participant cancels, move the next waitlisted participant up
  if (participant.status === 'registered') {
    const next = db.prepare(`
      SELECT * FROM participants 
      WHERE workshop_id = ? AND status = 'waitlist'
      ORDER BY ROWID ASC LIMIT 1
    `).get(req.params.id);
    if (next) {
      db.prepare(`UPDATE participants SET status = 'registered' WHERE id = ?`).run(next.id);
    }
  }
  
  res.json({ message: 'Cancelled' });
});

// Get workshop details
app.get('/workshops/:id', (req, res) => {
  const workshop = db.prepare(`SELECT * FROM workshops WHERE id = ?`).get(req.params.id);
  if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
  
  const participants = db.prepare(`
    SELECT name, email FROM participants 
    WHERE workshop_id = ? AND status = 'registered'
  `).all(workshop.id);
  
  const waitlist = db.prepare(`
    SELECT name, email FROM participants 
    WHERE workshop_id = ? AND status = 'waitlist'
  `).all(workshop.id);
  
  res.json({ ...workshop, participants, waitlist });
});

// Only start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

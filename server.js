const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Simple CORS & preflight handling
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve static files from this folder
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'profile-data.json');

// Database / file storage fallback
const DATABASE_URL = process.env.DATABASE_URL || null;
let pgClient = null;

async function initPostgres() {
  const { Client } = require('pg');
  pgClient = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL && DATABASE_URL.includes('postgres')
      ? { rejectUnauthorized: false }
      : false
  });
  await pgClient.connect();

  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL
    );
  `);

  await pgClient.query(`
    INSERT INTO profile (id, data)
    VALUES (1, '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `);
}

async function readProfile() {
  if (pgClient) {
    const r = await pgClient.query('SELECT data FROM profile WHERE id = 1');
    return (r.rows[0] && r.rows[0].data) || {};
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf8');
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

async function writeProfile(obj) {
  if (pgClient) {
    await pgClient.query(
      'INSERT INTO profile (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
      [obj]
    );
    return;
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

app.get('/api/profile', async (req, res) => {
  try {
    const data = await readProfile();
    res.json(data || {});
  } catch (e) {
    res.status(500).json({ error: 'read_error' });
  }
});

app.post('/api/profile', async (req, res) => {
  const body = req.body || {};
  try {
    await writeProfile(body);
    res.json({ ok: true });
  } catch (e) {
    console.error('write error', e);
    res.status(500).json({ error: 'write_error' });
  }
});

// ⭐ ADD THIS — Serve your main HTML file at "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "mainhtml.html"));
});

// Initialize Postgres if DATABASE_URL provided
if (DATABASE_URL) {
  initPostgres()
    .then(() => console.log('Connected to Postgres'))
    .catch(err => {
      console.error('Postgres init failed', err);
      pgClient = null;
    });
} else {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

app.listen(PORT, () =>
  console.log(`profile-server running: http://localhost:${PORT}`)
);

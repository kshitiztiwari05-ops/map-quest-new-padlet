import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const SECRET = process.env.JWT_SECRET || 'change-me-before-the-pilot';
const TEACHER_CODE = process.env.TEACHER_CODE || 'teacher123';
const FILE = path.join(dir, 'data', 'db.json');

// --- tiny JSON database (fine for a classroom pilot) ---
let db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { users: [], posts: [] };
const save = () => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 1)); };
if (!db.posts.length) {
  const S = [['PixelPanda','Class 8','DL','Air, drawn as cigarettes','I tried to show city air so a 10 year old gets it in one look.','bars'],
    ['MonsoonMaker','Class 9','KL','Why did reading take off here?','Three things I found, and one thing I could not explain yet.','line'],
    ['ChaiCoder','Class 10','KA','A timeline of a tech city','From one office to thousands. I mapped the key moments.','time'],
    ['DosaDetective','Class 7','TN','A town that grew around a temple','I drew the streets and labelled what each one was for.','dots'],
    ['RiverRhino','Class 9','AS','One animal, one story','How I picked a species and followed its numbers.','bars']];
  db.posts = S.map(([nick, klass, place, title, story, visual]) => ({ id: crypto.randomUUID(), nick, klass, place, title, story, visual, share: true, status: 'approved', likes: [], at: Date.now() }));
  save();
}

const clean = (v, n) => String(v ?? '').trim().slice(0, n);
const token = u => jwt.sign({ id: u.id, nick: u.nick, role: u.role, klass: u.klass }, SECRET, { expiresIn: '7d' });
const auth = role => (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').slice(7), SECRET); } catch { return res.status(401).json({ error: 'Please log in.' }); }
  if (role && req.user.role !== role) return res.status(403).json({ error: `Only a ${role} can do this.` });
  next();
};

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(dir, 'public')));

app.post('/api/register', async (req, res) => {
  const nick = clean(req.body.nick, 20), pw = clean(req.body.password, 100), role = req.body.role === 'teacher' ? 'teacher' : 'student';
  if (nick.length < 3 || pw.length < 6) return res.status(400).json({ error: 'Nickname needs 3+ characters and password 6+.' });
  if (role === 'teacher' && req.body.code !== TEACHER_CODE) return res.status(403).json({ error: 'Wrong teacher code.' });
  if (db.users.some(u => u.nick.toLowerCase() === nick.toLowerCase())) return res.status(409).json({ error: 'That nickname is taken.' });
  const u = { id: crypto.randomUUID(), nick, role, klass: clean(req.body.klass, 10) || 'Class 8', hash: await bcrypt.hash(pw, 10) };
  db.users.push(u); save();
  res.json({ token: token(u), user: { nick, role, klass: u.klass } });
});

app.post('/api/login', async (req, res) => {
  const u = db.users.find(x => x.nick.toLowerCase() === clean(req.body.nick, 20).toLowerCase());
  if (!u || !(await bcrypt.compare(clean(req.body.password, 100), u.hash))) return res.status(401).json({ error: 'Wrong nickname or password.' });
  res.json({ token: token(u), user: { nick: u.nick, role: u.role, klass: u.klass } });
});

const pub = p => ({ id: p.id, nick: p.nick, klass: p.klass, place: p.place, title: p.title, story: p.story, visual: p.visual, share: p.share, likes: p.likes.length });

app.get('/api/posts', (_req, res) => res.json(db.posts.filter(p => p.status === 'approved').map(pub)));

app.post('/api/posts', auth('student'), (req, res) => {
  const b = req.body, title = clean(b.title, 120), story = clean(b.story, 5000);
  if (!title || !story || !/^[A-Z]{2}$/.test(b.place)) return res.status(400).json({ error: 'Add a place, title and story.' });
  const visual = ['bars', 'line', 'time', 'dots'].includes(b.visual) ? b.visual : 'bars';
  db.posts.push({ id: crypto.randomUUID(), nick: req.user.nick, klass: req.user.klass, place: b.place, title, story, visual, share: !!b.share, status: 'pending', likes: [], at: Date.now() });
  save(); res.json({ ok: true });
});

app.get('/api/pending', auth('teacher'), (_req, res) => res.json(db.posts.filter(p => p.status === 'pending').map(pub)));

app.post('/api/posts/:id/review', auth('teacher'), (req, res) => {
  const p = db.posts.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found.' });
  p.status = req.body.decision === 'approve' ? 'approved' : 'sent_back'; save(); res.json({ ok: true });
});

app.post('/api/posts/:id/like', auth(), (req, res) => {
  const p = db.posts.find(x => x.id === req.params.id && x.status === 'approved');
  if (!p) return res.status(404).json({ error: 'Not found.' });
  const i = p.likes.indexOf(req.user.id); i < 0 ? p.likes.push(req.user.id) : p.likes.splice(i, 1);
  save(); res.json({ likes: p.likes.length });
});

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error.' }); });
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`MapQuest running at http://localhost:${port}`));

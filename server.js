const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    next();
});
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'stories.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ stories: [], userReactions: {} }, null, 2));

function readData() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return { stories: [], userReactions: {} }; } }
function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

app.get('/api/stories', (req, res) => res.json(readData().stories));

app.post('/api/stories', (req, res) => {
    const db = readData();
    const { name, author, data } = req.body;
    if (!name || !data || !author) return res.status(400).json({ error: 'Missing fields' });
    const newStory = { id: Date.now(), name, author, data, uploadedAt: new Date().toISOString(), reactions: { like: 0, love: 0, wow: 0, sad: 0, clap: 0 }, comments: [] };
    db.stories.push(newStory);
    writeData(db);
    res.status(201).json(newStory);
});

app.post('/api/stories/:id/comments', (req, res) => {
    const db = readData();
    const story = db.stories.find(s => s.id === Number(req.params.id));
    if (!story) return res.status(404).json({ error: 'Not found' });
    const { user, text } = req.body;
    if (!user || !text) return res.status(400).json({ error: 'user and text required' });
    story.comments.push({ user, text, time: new Date().toISOString() });
    writeData(db);
    res.json(story);
});

app.post('/api/stories/:id/reactions', (req, res) => {
    const db = readData();
    const story = db.stories.find(s => s.id === Number(req.params.id));
    if (!story) return res.status(404).json({ error: 'Not found' });
    const { username, type } = req.body;
    if (!username || !['like','love','wow','sad','clap'].includes(type)) return res.status(400).json({ error: 'Invalid' });
    if (!db.userReactions) db.userReactions = {};
    if (!db.userReactions[username]) db.userReactions[username] = {};
    if (!db.userReactions[username][story.id]) db.userReactions[username][story.id] = {};
    const already = db.userReactions[username][story.id][type];
    if (already) { delete db.userReactions[username][story.id][type]; story.reactions[type] = Math.max(0, story.reactions[type] - 1); }
    else { db.userReactions[username][story.id][type] = true; story.reactions[type]++; }
    writeData(db);
    res.json({ story, userReaction: !!db.userReactions[username]?.[story.id]?.[type] });
});

app.get('/{*path}', (req, res) => res.sendFile(path.join(__dirname, 'community.html')));

app.listen(PORT, () => console.log(`🚀 The Button server running on http://localhost:${PORT}`));
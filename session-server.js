const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// In-memory storage: sessions and questions
const sessions = {};

// Helper: Generate unique class code
function generateClassCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Teacher starts a new session
app.post('/start-session', (req, res) => {
  const code = generateClassCode();
  sessions[code] = { questions: [] };
  res.json({ classCode: code });
});

// Student joins a session (just checks code exists)
app.post('/join-session', (req, res) => {
  const { classCode } = req.body;
  if (!sessions[classCode]) return res.status(404).json({ error: 'Invalid class code' });
  res.json({ success: true });
});

// Submit a question
app.post('/questions/:classCode', (req, res) => {
  const { classCode } = req.params;
  const { question } = req.body;
  if (!sessions[classCode]) return res.status(404).json({ error: 'Invalid class code' });
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Invalid question' });
  }
  const newQ = {
    id: Date.now().toString() + Math.floor(Math.random()*1000),
    text: question.trim(),
    answered: false,
    votes: 0
  };
  sessions[classCode].questions.push(newQ);
  io.to(classCode).emit('questions', sessions[classCode].questions);
  res.status(201).json({ success: true });
});

// Upvote/downvote
app.post('/questions/:classCode/:id/:action', (req, res) => {
  const { classCode, id, action } = req.params;
  if (!sessions[classCode]) return res.status(404).json({ error: 'Invalid class code' });
  const q = sessions[classCode].questions.find(q => q.id === id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  if (action === 'upvote') q.votes++;
  else if (action === 'downvote') q.votes--;
  else return res.status(400).json({ error: 'Invalid action' });
  io.to(classCode).emit('questions', sessions[classCode].questions);
  res.json({ success: true, votes: q.votes });
});

// Mark as answered
app.post('/questions/:classCode/:id/answer', (req, res) => {
  const { classCode, id } = req.params;
  if (!sessions[classCode]) return res.status(404).json({ error: 'Invalid class code' });
  const q = sessions[classCode].questions.find(q => q.id === id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  q.answered = true;
  io.to(classCode).emit('questions', sessions[classCode].questions);
  res.json({ success: true });
});

// Remove question
app.delete('/questions/:classCode/:id', (req, res) => {
  const { classCode, id } = req.params;
  if (!sessions[classCode]) return res.status(404).json({ error: 'Invalid class code' });
  sessions[classCode].questions = sessions[classCode].questions.filter(q => q.id !== id);
  io.to(classCode).emit('questions', sessions[classCode].questions);
  res.json({ success: true });
});

// Get questions (for polling fallback)
app.get('/questions/:classCode', (req, res) => {
  if (!sessions[req.params.classCode]) return res.status(404).json({ error: 'Invalid class code' });
  res.json(sessions[req.params.classCode].questions);
});

// WebSocket: join class code room
io.on('connection', (socket) => {
  socket.on('join', (classCode) => {
    socket.join(classCode);
    if (sessions[classCode]) {
      socket.emit('questions', sessions[classCode].questions);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

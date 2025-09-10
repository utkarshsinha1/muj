const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'questions.json');

app.use(express.json());
app.use(express.static(__dirname));

// Helper: Load questions
function loadQuestions() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// Helper: Save questions
function saveQuestions(questions) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(questions, null, 2));
}

// POST /questions - submit a question
app.post('/questions', (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Invalid question' });
  }
  const questions = loadQuestions();
  const newQ = {
    id: Date.now().toString(),
    text: question.trim(),
    answered: false,
    votes: 0
  };
  questions.push(newQ);
  saveQuestions(questions);
  res.status(201).json({ success: true });
});

// GET /questions - get all questions
app.get('/questions', (req, res) => {
  const questions = loadQuestions();
  // Sort by votes descending, then unanswered first
  questions.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return (a.answered === b.answered) ? 0 : a.answered ? 1 : -1;
  });
  res.json(questions);
});

// POST /questions/:id/answer - mark as answered
app.post('/questions/:id/answer', (req, res) => {
  const { id } = req.params;
  const questions = loadQuestions();
  const idx = questions.findIndex(q => q.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  questions[idx].answered = true;
  saveQuestions(questions);
  res.json({ success: true });
});

// POST /questions/:id/upvote - upvote a question
app.post('/questions/:id/upvote', (req, res) => {
  const { id } = req.params;
  const questions = loadQuestions();
  const idx = questions.findIndex(q => q.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  questions[idx].votes = (questions[idx].votes || 0) + 1;
  saveQuestions(questions);
  res.json({ success: true, votes: questions[idx].votes });
});

// POST /questions/:id/downvote - downvote a question
app.post('/questions/:id/downvote', (req, res) => {
  const { id } = req.params;
  const questions = loadQuestions();
  const idx = questions.findIndex(q => q.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  questions[idx].votes = (questions[idx].votes || 0) - 1;
  saveQuestions(questions);
  res.json({ success: true, votes: questions[idx].votes });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
let socket, currentClassCode = null, isTeacher = false;
const SERVER_URL = 'http://10.58.190.182:3000';

function showTeacher() {
  document.getElementById('role-section').classList.add('hidden');
  document.getElementById('teacher-section').classList.remove('hidden');
}
function showStudent() {
  document.getElementById('role-section').classList.add('hidden');
  document.getElementById('student-section').classList.remove('hidden');
}
document.getElementById('startClassBtn').onclick = async function() {
  const res = await fetch(SERVER_URL + '/start-session', { method: 'POST' });
  const data = await res.json();
  currentClassCode = data.classCode;
  isTeacher = true;
  document.getElementById('classCodeBox').textContent = 'Class Code: ' + currentClassCode;
  document.getElementById('classCodeBox').classList.remove('hidden');
  console.log('Class code for teacher:', currentClassCode);
  socket = io(SERVER_URL);
  socket.emit('join', currentClassCode);
  socket.on('questions', renderTeacherQuestions);
};
function renderTeacherQuestions(questions) {
  const list = document.getElementById('teacherQuestionsList');
  list.innerHTML = '';
  // Sort: unanswered first, then answered
  questions.sort((a, b) => {
    if (a.answered && !b.answered) return 1;
    if (!a.answered && b.answered) return -1;
    return b.votes - a.votes;
  });
  questions.forEach(q => {
    const li = document.createElement('li');
    li.className = 'question-item' + (q.answered ? ' answered' : '');
    li.innerHTML = `<span>${q.text} ${q.answered ? '<span style="color:green; font-size:1.3em; margin-left:8px;">&#10003;</span>' : ''}</span>
      <span>
        <span style="margin:0 8px; font-weight:700;">${q.votes || 0}</span>
        <button onclick="markAnswered('${q.id}')" ${q.answered ? 'disabled' : ''}>Mark as Answered</button>
        <button class='remove-btn' onclick="removeQuestion('${q.id}')">Remove</button>
      </span>`;
    list.appendChild(li);
  });
}
async function markAnswered(id) {
  console.log('Marking as answered:', currentClassCode, id);
  await fetch(SERVER_URL + `/questions/${currentClassCode}/${id}/answer`, { method: 'POST' });
  // Force refresh by requesting the latest questions
  const res = await fetch(SERVER_URL + `/questions/${currentClassCode}`);
  const questions = await res.json();
  console.log('Questions after marking as answered:', questions);
  renderTeacherQuestions(questions);
}
async function removeQuestion(id) {
  await fetch(SERVER_URL + `/questions/${currentClassCode}/${id}`, { method: 'DELETE' });
}
document.getElementById('joinForm').onsubmit = async function(e) {
  e.preventDefault();
  const code = document.getElementById('classCodeInput').value.trim().toUpperCase();
  const res = await fetch(SERVER_URL + '/join-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classCode: code })
  });
  if (res.ok) {
    currentClassCode = code;
    document.getElementById('studentClassBox').textContent = 'Class Code: ' + currentClassCode;
    document.getElementById('studentClassBox').classList.remove('hidden');
    document.getElementById('questionForm').classList.remove('hidden');
    socket = io(SERVER_URL);
    socket.emit('join', currentClassCode);
    socket.on('questions', renderStudentQuestions);
  } else {
    alert('Invalid class code');
  }
};
document.getElementById('questionForm').onsubmit = async function(e) {
  e.preventDefault();
  const question = document.getElementById('questionInput').value.trim();
  if (!question) return;
  const res = await fetch(`/questions/${currentClassCode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  if (res.ok) {
    document.getElementById('student-message').textContent = 'Question submitted!';
    document.getElementById('questionInput').value = '';
    setTimeout(() => {
      document.getElementById('student-message').textContent = '';
    }, 2000);
  } else {
    document.getElementById('student-message').textContent = 'Error submitting question.';
  }
};
function renderStudentQuestions(questions) {
  const list = document.getElementById('studentQuestionsList');
  list.innerHTML = '';
  questions.sort((a,b) => b.votes - a.votes);
  const votes = JSON.parse(localStorage.getItem('votes') || '{}');
  questions.forEach(q => {
    const li = document.createElement('li');
    li.className = 'question-item' + (q.answered ? ' answered' : '');
    let upvoted = votes[q.id] === 'up';
    let downvoted = votes[q.id] === 'down';
    li.innerHTML = `<span>${q.text}</span>
      <span>
        <button class='upvote' onclick="upvoteQuestion('${q.id}')" ${upvoted ? 'disabled' : ''}>&#x25B2;</button>
        <span style="margin:0 8px; font-weight:700;">${q.votes || 0}</span>
        <button class='downvote' onclick="downvoteQuestion('${q.id}')" ${downvoted ? 'disabled' : ''}>&#x25BC;</button>
        ${q.answered ? '<em>Answered</em>' : ''}
      </span>`;
    list.appendChild(li);
  });
}
async function upvoteQuestion(id) {
  const votes = JSON.parse(localStorage.getItem('votes') || '{}');
  if (votes[id] === 'up') return;
  if (votes[id] === 'down')
  if (votes[id] === 'down') {
    await fetch(`/questions/${currentClassCode}/${id}/upvote`, { method: 'POST' });
    await fetch(`/questions/${currentClassCode}/${id}/downvote`, { method: 'POST' });
  }
  votes[id] = 'up';
  localStorage.setItem('votes', JSON.stringify(votes));
  await fetch(`/questions/${currentClassCode}/${id}/upvote`, { method: 'POST' });
}
async function downvoteQuestion(id) {
  const votes = JSON.parse(localStorage.getItem('votes') || '{}');
  if (votes[id] === 'down') return;
  if (votes[id] === 'up') {
    await fetch(`/questions/${currentClassCode}/${id}/downvote`, { method: 'POST' });
    await fetch(`/questions/${currentClassCode}/${id}/upvote`, { method: 'POST' });
  }
  votes[id] = 'down';
  localStorage.setItem('votes', JSON.stringify(votes));
  await fetch(`/questions/${currentClassCode}/${id}/downvote`, { method: 'POST' });
}

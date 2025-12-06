import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const playersListEl = document.getElementById('players');
const rankEl = document.getElementById('rank');

let meId = null;
let players = {};
let collectibles = {};
let gameWidth = canvas.width;
let gameHeight = canvas.height;

socket.on('connect', () => {
  meId = socket.id;
});

// Servidor manda el estado completo
socket.on('state', (state) => {
  players = state.players || {};
  collectibles = state.collectibles || {};
  gameWidth = state.width || canvas.width;
  gameHeight = state.height || canvas.height;

  draw();

  const myData = players[meId];
  if (myData) {
    const myPlayer = new Player(myData);
    const allPlayers = Object.values(players).map((p) => new Player(p));
    rankEl.textContent = myPlayer.calculateRank(allPlayers);
  } else {
    rankEl.textContent = '';
  }

  renderPlayersList();
});

function renderPlayersList() {
  playersListEl.innerHTML = '';
  const arr = Object.values(players).sort((a, b) => b.score - a.score);
  arr.forEach((p, idx) => {
    const li = document.createElement('li');
    const you = p.id === meId ? ' (you)' : '';
    li.textContent = `${idx + 1}. ${p.id.slice(0, 4)} - ${p.score}${you}`;
    playersListEl.appendChild(li);
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar ítems
  Object.values(collectibles).forEach((item) => {
    const c = new Collectible(item);
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(c.x + 10, c.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  // Dibujar jugadores
  Object.values(players).forEach((p) => {
    ctx.fillStyle = p.id === meId ? '#00aaFF' : '#444444';
    ctx.fillRect(p.x, p.y, 20, 20);
  });
}

// Controles de teclado
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  sendMove(e.key);
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

function sendMove(key) {
  let direction = null;
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') direction = 'left';
  if (key === 'ArrowRight' || key === 'd' || key === 'D') direction = 'right';
  if (key === 'ArrowUp' || key === 'w' || key === 'W') direction = 'up';
  if (key === 'ArrowDown' || key === 's' || key === 'S') direction = 'down';

  if (!direction) return;

  socket.emit('move', { direction, amount: 10 });
}

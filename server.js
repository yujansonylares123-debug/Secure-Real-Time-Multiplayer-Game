require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const socketIO = require('socket.io');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

// STATIC
app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

// 🔐 Seguridad con Helmet (versión 3.21.3)

// Evitar que el navegador intente adivinar el MIME type
app.use(helmet.noSniff());

// Proteger contra XSS (X-XSS-Protection: 1; mode=block)
app.use(helmet.xssFilter());

// No cachear nada en el cliente
app.use(helmet.noCache());

// Decir que el sitio está "powered by PHP 7.4.3"
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }));

// BODY PARSER + CORS
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Para FCC y acceso externo (Replit, etc.)
app.use(cors({ origin: '*' }));

// Index
app.route('/').get(function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Rutas de FCC testing
fccTestingRoutes(app);

// 404
app.use(function (req, res, next) {
  res
    .status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

// Servidor HTTP + Socket.io
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);

  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

// =====================
//   LÓGICA DEL JUEGO
// =====================

const io = socketIO(server);

const players = {};      // { socketId: { id, x, y, score } }
const collectibles = {}; // { id: { id, x, y, value } }

const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;
const PLAYER_SPEED = 10;
const PLAYER_SIZE = 20;
const ITEM_VALUE = 1;

function randomPosition() {
  return {
    x: Math.floor(Math.random() * (GAME_WIDTH - PLAYER_SIZE)),
    y: Math.floor(Math.random() * (GAME_HEIGHT - PLAYER_SIZE)),
  };
}

function createCollectible() {
  const pos = randomPosition();
  const id = Date.now() + Math.random();
  return {
    id,
    x: pos.x,
    y: pos.y,
    value: ITEM_VALUE,
  };
}

// Creamos un único ítem coleccionable
const mainItem = createCollectible();
collectibles[mainItem.id] = mainItem;

function getGameState() {
  return {
    players,
    collectibles,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  };
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Crear jugador
  const startPos = randomPosition();
  players[socket.id] = {
    id: socket.id,
    x: startPos.x,
    y: startPos.y,
    score: 0,
  };

  // Enviar estado inicial solo a ese jugador
  socket.emit('state', getGameState());
  // Avisar a todos del nuevo jugador
  socket.broadcast.emit('state', getGameState());

  // Movimiento del jugador
  socket.on('move', (data) => {
    const player = players[socket.id];
    if (!player) return;

    const amount = data && data.amount ? data.amount : PLAYER_SPEED;

    switch (data.direction) {
      case 'left':
        player.x -= amount;
        break;
      case 'right':
        player.x += amount;
        break;
      case 'up':
        player.y -= amount;
        break;
      case 'down':
        player.y += amount;
        break;
      default:
        return;
    }

    // Limitar al área de juego
    player.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, player.x));
    player.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, player.y));

    // Comprobar colisión con el ítem (simple AABB)
    Object.values(collectibles).forEach((item) => {
      const distX = Math.abs(player.x - item.x);
      const distY = Math.abs(player.y - item.y);
      if (distX < PLAYER_SIZE && distY < PLAYER_SIZE) {
        // Recoge el ítem
        player.score += item.value;

        // Re-generar el ítem en otra posición
        const newItem = createCollectible();
        delete collectibles[item.id];
        collectibles[newItem.id] = newItem;
      }
    });

    // Mandar nuevo estado a todos
    io.emit('state', getGameState());
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('state', getGameState());
  });
});

module.exports = app; // para los tests de FCC

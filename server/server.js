// ==========================================
// CAR SOCCER - MULTIPLAYER SERVER (RENDER FIX)
// ==========================================
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Enable CORS so your GitHub Pages site can talk to this server
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// FIX: Point to the root directory where index.html lives
app.use(express.static(path.join(__dirname, '../')));

// Game State
let gameState = {
    players: {},
    ball: { position: { x: 0, y: 5, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
    scores: { blue: 0, red: 0 },
    matchTime: 300,
    isMatchActive: true
};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Simple team assignment
    const team = Object.keys(gameState.players).length % 2 === 0 ? 'blue' : 'red';
    
    gameState.players[socket.id] = {
        id: socket.id,
        team: team,
        position: { x: 0, y: 2, z: team === 'blue' ? 30 : -30 },
        lastUpdate: Date.now()
    };

    socket.emit('playerId', socket.id);
    io.emit('playerJoined', gameState.players[socket.id]);

    socket.on('playerUpdate', (data) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].position = data.position;
            gameState.players[socket.id].rotation = data.rotation;
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        io.emit('playerLeft', { id: socket.id });
    });
});

// Game Loop (60 ticks per second)
setInterval(() => {
    io.emit('gameState', gameState);
}, 1000 / 60);

// ==========================================
// THE CRITICAL RENDER FIX
// ==========================================
// Render uses a dynamic port. '0.0.0.0' allows external traffic.
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log('==========================================');
    console.log(`SERVER LIVE ON PORT: ${PORT}`);
    console.log('==========================================');
});

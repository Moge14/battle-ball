// ==========================================
// CAR SOCCER - MULTIPLAYER SERVER (FIXED)
// ==========================================
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Initialize Express and Socket.io
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

/**
 * FIX: Path Handling
 * This tells Express to look for index.html in the root folder, 
 * since your server is inside the /server subfolder.
 */
app.use(express.static(path.join(__dirname, '../')));

// Configuration
const CONFIG = {
    arena: {
        width: 100,
        depth: 140,
        goalWidth: 30,
        goalDepth: 10
    },
    tickRate: 60, // Server updates per second
    maxPlayers: 8
};

// Game state
let gameState = {
    players: {},
    ball: {
        position: { x: 0, y: 5, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 }
    },
    scores: { blue: 0, red: 0 },
    matchTime: 300,
    isMatchActive: true
};

let playerCount = 0;
const playerTeams = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    playerCount++;

    const team = playerCount % 2 === 0 ? 'red' : 'blue';
    playerTeams[socket.id] = team;

    const spawnZ = team === 'blue' ? 30 : -30;
    gameState.players[socket.id] = {
        id: socket.id,
        team: team,
        position: { x: 0, y: 2, z: spawnZ },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        velocity: { x: 0, y: 0, z: 0 },
        score: 0,
        ping: 0,
        lastUpdate: Date.now()
    };

    socket.emit('playerId', socket.id);
    socket.emit('teamAssignment', { team: team });
    io.emit('playerJoined', {
        id: socket.id,
        team: team,
        position: gameState.players[socket.id].position
    });
    socket.emit('gameState', gameState);

    socket.on('playerUpdate', (data) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].position = data.position;
            gameState.players[socket.id].rotation = data.rotation;
            gameState.players[socket.id].velocity = data.velocity;
            gameState.players[socket.id].lastUpdate = Date.now();
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        playerCount--;
        delete gameState.players[socket.id];
        delete playerTeams[socket.id];
        io.emit('playerLeft', { id: socket.id });
    });
});

// Game Loop
const TICK_INTERVAL = 1000 / CONFIG.tickRate;
let lastTickTime = Date.now();

function serverGameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTickTime) / 1000;
    lastTickTime = currentTime;

    if (gameState.isMatchActive) {
        gameState.matchTime -= deltaTime;
        if (gameState.matchTime <= 0) {
            gameState.matchTime = 0;
            gameState.isMatchActive = false;
        }
    }
    io.emit('gameState', gameState);
}

setInterval(serverGameLoop, TICK_INTERVAL);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('==========================================');
    console.log('   CAR SOCCER - MULTIPLAYER SERVER');
    console.log('==========================================');
    console.log(`Server running on port ${PORT}`);
    console.log('==========================================');
});

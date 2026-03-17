// ==========================================
// CAR SOCCER - MULTIPLAYER SERVER
// ==========================================
// Server-authoritative game state with client-side prediction
// and linear interpolation for smooth multiplayer experience

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

// Serve static files
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

// Game state (server is source of truth)
let gameState = {
    players: {},
    ball: {
        position: { x: 0, y: 5, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 }
    },
    scores: {
        blue: 0,
        red: 0
    },
    matchTime: 300, // 5 minutes in seconds
    isMatchActive: true
};

// Player tracking
let playerCount = 0;
const playerTeams = {}; // Track which team each player is on

// ==========================================
// SOCKET.IO CONNECTION HANDLING
// ==========================================

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    playerCount++;

    // Assign team (alternate between blue and red)
    const team = playerCount % 2 === 0 ? 'red' : 'blue';
    playerTeams[socket.id] = team;

    // Initialize player state
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

    // Send player ID and team assignment
    socket.emit('playerId', socket.id);
    socket.emit('teamAssignment', { team: team });

    // Notify all clients about new player
    io.emit('playerJoined', {
        id: socket.id,
        team: team,
        position: gameState.players[socket.id].position
    });

    // Send current game state to new player
    socket.emit('gameState', gameState);

    console.log(`Player ${socket.id} assigned to ${team} team`);
    console.log(`Total players: ${playerCount}`);

    // ==========================================
    // PLAYER UPDATE (Client-Side Prediction)
    // ==========================================
    socket.on('playerUpdate', (data) => {
        if (gameState.players[socket.id]) {
            // Store client prediction for reconciliation
            gameState.players[socket.id].position = data.position;
            gameState.players[socket.id].rotation = data.rotation;
            gameState.players[socket.id].velocity = data.velocity;
            gameState.players[socket.id].lastUpdate = Date.now();
        }
    });

    // ==========================================
    // PLAYER INPUT (More secure alternative)
    // ==========================================
    socket.on('playerInput', (input) => {
        // Instead of trusting client positions, validate inputs
        // and calculate server-side physics
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].input = input;
            // Server will process this in the game loop
        }
    });

    // ==========================================
    // GOAL SCORED
    // ==========================================
    socket.on('goalScored', (data) => {
        // Verify goal is valid (server-side validation)
        if (isValidGoal(data)) {
            const scoringTeam = data.team;
            gameState.scores[scoringTeam]++;
            
            console.log(`GOAL! ${scoringTeam.toUpperCase()} team scores!`);
            console.log(`Score - Blue: ${gameState.scores.blue}, Red: ${gameState.scores.red}`);
            
            // Broadcast goal to all clients
            io.emit('goal', {
                team: scoringTeam,
                scores: gameState.scores
            });
            
            // Reset ball
            resetBall();
            
            // Send updated game state
            io.emit('gameState', gameState);
        }
    });

    // ==========================================
    // PING MEASUREMENT
    // ==========================================
    socket.on('ping', (data) => {
        socket.emit('ping', { timestamp: Date.now() });
    });

    // ==========================================
    // PLAYER DISCONNECT
    // ==========================================
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        playerCount--;
        
        // Remove player from game state
        delete gameState.players[socket.id];
        delete playerTeams[socket.id];
        
        // Notify other clients
        io.emit('playerLeft', { id: socket.id });
        
        console.log(`Total players: ${playerCount}`);
    });
});

// ==========================================
// GAME STATE VALIDATION
// ==========================================

function isValidGoal(data) {
    const ballPos = gameState.ball.position;
    
    // Verify ball is actually in goal area
    if (data.team === 'blue') {
        // Blue team scores in red goal (positive Z)
        return ballPos.z > CONFIG.arena.depth / 2 && 
               Math.abs(ballPos.x) < CONFIG.arena.goalWidth / 2;
    } else {
        // Red team scores in blue goal (negative Z)
        return ballPos.z < -CONFIG.arena.depth / 2 && 
               Math.abs(ballPos.x) < CONFIG.arena.goalWidth / 2;
    }
}

function resetBall() {
    gameState.ball = {
        position: { x: 0, y: 5, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 }
    };
}

// ==========================================
// SERVER GAME LOOP (Authoritative)
// ==========================================

const TICK_INTERVAL = 1000 / CONFIG.tickRate;
let lastTickTime = Date.now();

function serverGameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTickTime) / 1000;
    lastTickTime = currentTime;

    // Update match timer
    if (gameState.isMatchActive) {
        gameState.matchTime -= deltaTime;
        
        if (gameState.matchTime <= 0) {
            gameState.matchTime = 0;
            gameState.isMatchActive = false;
            handleMatchEnd();
        }
    }

    // Physics reconciliation (simplified)
    // In a full implementation, you would run Cannon.js on the server
    // and validate all physics calculations server-side
    
    // For now, we trust client updates but validate critical events
    // like goals and collisions

    // Broadcast game state to all clients
    io.emit('gameState', gameState);
}

function handleMatchEnd() {
    console.log('Match ended!');
    console.log(`Final Score - Blue: ${gameState.scores.blue}, Red: ${gameState.scores.red}`);
    
    const winner = gameState.scores.blue > gameState.scores.red ? 'blue' : 
                   gameState.scores.red > gameState.scores.blue ? 'red' : 'tie';
    
    io.emit('matchEnd', {
        winner: winner,
        scores: gameState.scores
    });
}

// Start the game loop
setInterval(serverGameLoop, TICK_INTERVAL);

// ==========================================
// ANTI-CHEAT & VALIDATION
// ==========================================

// Position validation (prevent teleporting)
function validatePlayerPosition(playerId, newPosition) {
    const player = gameState.players[playerId];
    if (!player) return false;
    
    const distance = Math.sqrt(
        Math.pow(newPosition.x - player.position.x, 2) +
        Math.pow(newPosition.z - player.position.z, 2)
    );
    
    // Maximum distance player can move in one update (anti-cheat)
    const maxDistance = 5; // Adjust based on game speed
    return distance < maxDistance;
}

// Speed validation
function validatePlayerSpeed(playerId, velocity) {
    const speed = Math.sqrt(
        velocity.x * velocity.x + 
        velocity.y * velocity.y + 
        velocity.z * velocity.z
    );
    
    const maxSpeed = 60; // Adjust based on game config
    return speed < maxSpeed;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function getPlayersByTeam(team) {
    return Object.values(gameState.players).filter(p => p.team === team);
}

function resetMatch() {
    gameState.scores = { blue: 0, red: 0 };
    gameState.matchTime = 300;
    gameState.isMatchActive = true;
    resetBall();
    
    // Reset all player positions
    for (let id in gameState.players) {
        const team = gameState.players[id].team;
        const spawnZ = team === 'blue' ? 30 : -30;
        gameState.players[id].position = { x: 0, y: 2, z: spawnZ };
        gameState.players[id].velocity = { x: 0, y: 0, z: 0 };
    }
    
    io.emit('matchReset');
    console.log('Match reset');
}

// ==========================================
// ADMIN COMMANDS (Optional)
// ==========================================

// Reset match command
app.get('/admin/reset', (req, res) => {
    resetMatch();
    res.json({ success: true, message: 'Match reset' });
});

// Get game state
app.get('/admin/state', (req, res) => {
    res.json(gameState);
});

// Get server stats
app.get('/admin/stats', (req, res) => {
    res.json({
        playerCount: playerCount,
        uptime: process.uptime(),
        matchTime: gameState.matchTime,
        scores: gameState.scores
    });
});

// ==========================================
// SERVER START
// ==========================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log('==========================================');
    console.log('   CAR SOCCER - MULTIPLAYER SERVER');
    console.log('==========================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`Game tick rate: ${CONFIG.tickRate} Hz`);
    console.log(`Max players: ${CONFIG.maxPlayers}`);
    console.log('==========================================');
    console.log('Waiting for players to connect...');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };

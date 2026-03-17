// ==========================================
// GAME CONFIGURATION FILE
// ==========================================
// Centralized configuration for easy tweaking

const GameConfig = {
    // Server settings
    server: {
        port: 3000,
        tickRate: 60,              // Physics updates per second
        maxPlayers: 8,             // Maximum concurrent players
        matchDuration: 300,        // Match length in seconds (5 minutes)
    },

    // Arena dimensions
    arena: {
        width: 100,                // Field width
        depth: 140,                // Field length
        wallHeight: 10,            // Height of boundary walls
        goalWidth: 30,             // Goal opening width
        goalDepth: 10,             // Goal depth (how far back it goes)
    },

    // Car physics and handling
    car: {
        dimensions: {
            width: 3,
            height: 1.5,
            depth: 5,
        },
        physics: {
            mass: 1000,            // Car weight (affects momentum)
            maxSpeed: 50,          // Top speed (units per second)
            acceleration: 30,      // Acceleration force
            turnSpeed: 3,          // Turning angular velocity
            boostMultiplier: 1.5,  // Speed multiplier when boosting
        },
        handling: {
            linearDamping: 0.3,    // How quickly car slows down (0-1)
            angularDamping: 0.5,   // How quickly car stops turning (0-1)
        }
    },

    // Ball physics
    ball: {
        radius: 1.5,               // Ball size
        mass: 100,                 // Ball weight
        restitution: 0.7,          // Bounciness (0=no bounce, 1=perfect bounce)
        spawnHeight: 5,            // Height to spawn ball at
    },

    // World physics
    physics: {
        gravity: -30,              // Gravity force (negative = down)
        friction: 0.3,             // Surface friction (0-1)
        restitution: 0.3,          // Wall bounciness (0-1)
        timeStep: 1/60,            // Physics simulation step
    },

    // Camera settings
    camera: {
        fov: 75,                   // Field of view
        offset: {
            x: 0,
            y: 8,                  // Height above car
            z: 15,                 // Distance behind car
        },
        lerpFactor: 0.1,           // How smoothly camera follows (0-1)
    },

    // Network settings
    network: {
        playerUpdateRate: 20,      // Player position updates per second
        stateUpdateRate: 60,       // Game state broadcasts per second
        maxPing: 500,              // Kick players with ping above this
        reconnectAttempts: 5,      // Connection retry attempts
        reconnectDelay: 1000,      // Delay between retries (ms)
    },

    // Anti-cheat validation
    antiCheat: {
        maxMovementPerTick: 5,     // Max distance player can move per update
        maxVelocity: 60,           // Max velocity magnitude
        enablePositionValidation: true,
        enableSpeedValidation: true,
        enableGoalValidation: true,
    },

    // Visual settings
    graphics: {
        enableShadows: true,
        shadowMapSize: 2048,
        antialias: true,
        fogDensity: 0.005,
        fogStart: 50,
        fogEnd: 200,
    },

    // Team colors
    teams: {
        blue: {
            color: 0x00d4ff,
            spawnZ: 30,            // Where blue team spawns
            goalZ: 70,             // Blue team's goal line
        },
        red: {
            color: 0xff0066,
            spawnZ: -30,           // Where red team spawns
            goalZ: -70,            // Red team's goal line
        }
    },

    // Scoring rules
    scoring: {
        goalResetDelay: 1000,      // Delay before resetting after goal (ms)
        goalNotificationDuration: 2000, // How long to show "GOAL!" (ms)
    },

    // Debug settings
    debug: {
        showPhysicsWireframes: false,
        logPlayerPositions: false,
        logGoalEvents: true,
        showFPS: false,
        logNetworkStats: false,
    }
};

// Export for use in both client and server
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}

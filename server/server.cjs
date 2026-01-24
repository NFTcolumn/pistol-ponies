const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Use environment PORT (Railway sets this) or default to 3000 for local development
const PORT = process.env.PORT || 3000;
const API_PORT = process.env.API_PORT || 3001;
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;

class GameServer {
    constructor() {
        // Create HTTP server first
        this.httpServer = http.createServer(this.handleHTTPRequest.bind(this));

        // Attach WebSocket server to HTTP server
        this.wss = new WebSocket.Server({ server: this.httpServer });

        this.players = new Map();
        this.bullets = [];
        this.nextPlayerId = 1;
        this.bots = new Map();
        this.botNames = [
            'Shadow-Bolt', 'Neon-Nitro', 'Crimson-Clydesdale', 'Iron-Iris', 'Quantum-Quinter',
            'Gunslinger-Glory', 'Ghost-Gallop', 'Bullet-Blaze', 'Spectral-Spur', 'Thunder-Trots',
            'Midnight-Mare', 'Digital-Dash', 'Rogue-Racer', 'Plasma-Pony', 'Void-Vagabond',
            'Steel-Stallion', 'Cyber-Colt', 'Aether-Alpha', 'Rarity-Rager', 'Twilight-Tactical',
            'Apple-Sniper', 'Pinkie-Primal', 'Flutter-Fury'
        ];

        // Map configuration
        this.mapWidth = 2000;
        this.mapHeight = 2000;

        // Maze walls
        this.walls = [
            // Outer boundaries - 4 ad slots per wall (16 total)
            // North wall (4 sections)
            { x: 0, y: 0, width: 500, height: 40, isEdge: true, adSlot: 'north_1' },
            { x: 500, y: 0, width: 500, height: 40, isEdge: true, adSlot: 'north_2' },
            { x: 1000, y: 0, width: 500, height: 40, isEdge: true, adSlot: 'north_3' },
            { x: 1500, y: 0, width: 500, height: 40, isEdge: true, adSlot: 'north_4' },
            // South wall (4 sections)
            { x: 0, y: 1960, width: 500, height: 40, isEdge: true, adSlot: 'south_1' },
            { x: 500, y: 1960, width: 500, height: 40, isEdge: true, adSlot: 'south_2' },
            { x: 1000, y: 1960, width: 500, height: 40, isEdge: true, adSlot: 'south_3' },
            { x: 1500, y: 1960, width: 500, height: 40, isEdge: true, adSlot: 'south_4' },
            // West wall (4 sections)
            { x: 0, y: 0, width: 40, height: 500, isEdge: true, adSlot: 'west_1' },
            { x: 0, y: 500, width: 40, height: 500, isEdge: true, adSlot: 'west_2' },
            { x: 0, y: 1000, width: 40, height: 500, isEdge: true, adSlot: 'west_3' },
            { x: 0, y: 1500, width: 40, height: 500, isEdge: true, adSlot: 'west_4' },
            // East wall (4 sections)
            { x: 1960, y: 0, width: 40, height: 500, isEdge: true, adSlot: 'east_1' },
            { x: 1960, y: 500, width: 40, height: 500, isEdge: true, adSlot: 'east_2' },
            { x: 1960, y: 1000, width: 40, height: 500, isEdge: true, adSlot: 'east_3' },
            { x: 1960, y: 1500, width: 40, height: 500, isEdge: true, adSlot: 'east_4' },

            // Internal maze walls (based on a 5x5 grid, 400x400 cells)
            // Row 1
            { x: 400, y: 40, width: 40, height: 360 },
            { x: 800, y: 40, width: 40, height: 360 },
            { x: 1200, y: 40, width: 40, height: 360 },
            { x: 1600, y: 40, width: 40, height: 360 },
            { x: 40, y: 200, width: 200, height: 40 },
            { x: 900, y: 200, width: 120, height: 40 },

            // Row 2
            { x: 40, y: 400, width: 360, height: 40 },
            { x: 800, y: 440, width: 40, height: 360 },
            { x: 1240, y: 400, width: 360, height: 40 },
            { x: 400, y: 440, width: 40, height: 160 },
            { x: 1600, y: 440, width: 40, height: 360 },

            // Row 3
            { x: 400, y: 800, width: 1200, height: 40 },
            { x: 400, y: 840, width: 40, height: 360 },
            { x: 800, y: 840, width: 40, height: 160 },
            { x: 1200, y: 840, width: 40, height: 160 },

            // Row 4
            { x: 800, y: 1200, width: 40, height: 360 },
            { x: 1200, y: 1200, width: 40, height: 360 },
            { x: 40, y: 1600, width: 760, height: 40 },
            { x: 1200, y: 1600, width: 760, height: 40 },
            { x: 400, y: 1360, width: 40, height: 240 },
            { x: 1600, y: 1200, width: 40, height: 240 },

            // Central obstacles for more tactical play
            { x: 960, y: 960, width: 80, height: 80 },
            { x: 800, y: 800, width: 80, height: 80 },
            { x: 1120, y: 1120, width: 80, height: 80 },
            { x: 1120, y: 800, width: 80, height: 80 },
            { x: 800, y: 1120, width: 80, height: 80 }
        ];
        // Initialize walls - edge walls stay whole, internal walls get chunked
        const rawWalls = this.walls;
        this.walls = [];
        const CHUNK_SIZE = 40;

        rawWalls.forEach((wall, wallIndex) => {
            // Edge walls are kept as single indestructible pieces
            if (wall.isEdge) {
                this.walls.push({
                    id: `edge_${wall.adSlot}`,
                    x: wall.x,
                    y: wall.y,
                    width: wall.width,
                    height: wall.height,
                    isEdge: true,
                    isDestructible: false,
                    adSlot: wall.adSlot,
                    adTexture: null // Can be set for ad images
                });
                return;
            }

            // Internal walls get chunked into 40x40 destructible pieces
            const cols = Math.ceil(wall.width / CHUNK_SIZE);
            const rows = Math.ceil(wall.height / CHUNK_SIZE);
            const chunkWidth = wall.width / cols;
            const chunkHeight = wall.height / rows;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    this.walls.push({
                        id: `wall_${wallIndex}_${r}_${c}`,
                        x: wall.x + c * chunkWidth,
                        y: wall.y + r * chunkHeight,
                        width: chunkWidth,
                        height: chunkHeight,
                        health: 3, // 3 shots to break
                        isDestructible: true
                    });
                }
            }
        });

        this.spawnPoints = [
            { x: 200, y: 200 },
            { x: 1800, y: 200 },
            { x: 200, y: 1800 },
            { x: 1800, y: 1800 },
            { x: 1000, y: 1000 },
            { x: 600, y: 600 },
            { x: 1400, y: 600 },
            { x: 600, y: 1400 },
            { x: 1400, y: 1400 }
        ];

        // Loot box spawn locations (more spread across the map)
        this.lootBoxSpawns = [
            { x: 300, y: 500 },
            { x: 700, y: 300 },
            { x: 1100, y: 500 },
            { x: 1500, y: 300 },
            { x: 1700, y: 700 },
            { x: 500, y: 1000 },
            { x: 900, y: 700 },
            { x: 1300, y: 1000 },
            { x: 300, y: 1300 },
            { x: 700, y: 1500 },
            { x: 1100, y: 1300 },
            { x: 1500, y: 1700 },
            { x: 1000, y: 500 },
            { x: 500, y: 700 },
            { x: 1000, y: 1500 },
            { x: 1500, y: 1100 }
        ];

        // Active loot boxes
        this.lootBoxes = [];
        this.spawnLootBoxes();

        // Floor tile system (destructible tiles)
        this.FLOOR_TILE_SIZE = 40;
        this.FLOOR_GRID_SIZE = 50; // 50x50 grid = 2000x2000 map
        this.floorTiles = [];
        this.initFloorTiles();

        // Leaderboard persistence
        this.leaderboardPath = path.join(__dirname, 'data', 'leaderboard.json');
        this.loadLeaderboard();

        // Start HTTP server (handles both WebSocket and API)
        this.httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`WebSocket and API endpoints ready`);
        });

        this.setupServer();
        this.startGameLoop();

        // Spawn initial bots (Increased to 12 for more action)
        for (let i = 0; i < 12; i++) {
            this.spawnBot();
        }
    }

    spawnBot() {
        const botId = `bot_${Math.floor(Math.random() * 1000000)}`;
        const spawn = this.getRandomSpawnPoint();
        const name = this.botNames[Math.floor(Math.random() * this.botNames.length)];

        const bot = {
            id: botId,
            isBot: true,
            name: `${name}`,
            x: spawn.x,
            y: spawn.y,
            vx: 0,
            vy: 0,
            height: 0,
            vHeight: 0,
            grounded: true,
            angle: Math.random() * Math.PI * 2,
            pitch: 0,
            health: 100,
            maxHealth: 100,
            alive: true,
            kills: 0,
            deaths: 0,
            color: this.randomColor(),
            slowedUntil: 0, // Leg shot slow debuff
            lastDamageTime: 0, // For health regen
            // Leveling system
            xp: 0,
            level: 1,
            killStreak: 0,
            highestKillStreak: 0,
            // Skill point system - 3 points per level
            skillPoints: 0,
            stats: {
                speed: 0,    // +5% move speed and bullet speed per point
                health: 0,   // +10 max HP per point
                ammo: 0,     // +2 max ammo per point
                jump: 0,     // +10% jump height per point
                dash: 0,     // +2.5% dash distance per point
                aim: 0       // -10% aim spread per point
            },
            weapon: {
                type: 'PISTOL',
                ammo: 12,
                maxAmmo: 12,
                reloading: false,
                lastShootTime: 0
            },
            // Bot specific
            targetId: null,
            lastDecisionTime: 0,
            patrolAngle: Math.random() * Math.PI * 2,
            patrolTime: 0
        };

        this.players.set(botId, bot);
        console.log(`Bot ${bot.name} spawned (${botId})`);
    }

    handleHTTPRequest(req, res) {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // API endpoints
        if (req.url === '/api/leaderboard' && req.method === 'GET') {
            const leaderboard = this.getLeaderboard(100);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(leaderboard));
            return;
        }

        if (req.url === '/api/link-wallet' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { playerName, walletAddress } = JSON.parse(body);
                    if (!playerName || !walletAddress) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing playerName or walletAddress' }));
                        return;
                    }

                    const success = this.linkWallet(playerName, walletAddress);
                    if (success) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Player not found' }));
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }

        // For non-API requests, return 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }

    setupServer() {
        // Handle WebSocket connections
        this.wss.on('connection', (ws, req) => {
            console.log('New client connected');

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });

            ws.on('close', () => {
                const player = this.getPlayerBySocket(ws);
                if (player) {
                    console.log(`Player ${player.name} disconnected`);
                    this.players.delete(player.id);
                    this.broadcast({
                        type: 'playerLeft',
                        playerId: player.id
                    });
                }
            });
        });

        console.log(`WebSocket handler ready`);
    }

    handleMessage(ws, data) {
        switch (data.type) {
            case 'getLeaderboard':
                const leaderboard = this.getLeaderboard(100);
                ws.send(JSON.stringify({
                    type: 'leaderboardData',
                    data: leaderboard
                }));
                break;
            case 'join':
                this.handleJoin(ws, data);
                break;
            case 'input':
                this.handleInput(ws, data);
                break;
            case 'shoot':
                this.handleShoot(ws, data);
                break
                ;
            case 'reload':
                this.handleReload(ws);
                break;
            case 'allocateStat':
                this.handleAllocateStat(ws, data);
                break;
            case 'syncStats':
                this.handleSyncStats(ws, data);
                break;
            case 'pong':
                // Handle pong for latency measurement
                break;
        }
    }

    handleJoin(ws, data) {
        const playerId = `player_${this.nextPlayerId++}`;
        const spawn = this.getRandomSpawnPoint();

        const player = {
            id: playerId,
            socket: ws,
            name: data.name || 'Player',
            x: spawn.x,
            y: spawn.y,
            vx: 0,
            vy: 0,
            height: 0, // 3D height (Y in Three.js)
            vHeight: 0, // Vertical velocity
            grounded: true,
            lastDashTime: 0,
            angle: 0,
            pitch: 0, // Vertical aiming
            health: 100,
            maxHealth: 100,
            alive: true,
            kills: 0,
            deaths: 0,
            color: this.randomColor(),
            slowedUntil: 0, // Leg shot slow debuff
            lastDamageTime: 0, // For health regen
            // Leveling system
            xp: 0,
            level: 1,
            killStreak: 0,
            highestKillStreak: 0,
            // Skill point system - 3 points per level
            skillPoints: 0,
            stats: {
                speed: 0,    // +5% move speed and bullet speed per point
                health: 0,   // +10 max HP per point
                ammo: 0,     // +2 max ammo per point
                jump: 0,     // +10% jump height per point
                dash: 0,     // +2.5% dash distance per point
                aim: 0       // -10% aim spread per point
            },
            weapon: {
                type: 'PISTOL',
                ammo: 12,
                maxAmmo: 12,
                reloading: false,
                lastShootTime: 0
            }
        };

        this.players.set(playerId, player);

        // Send welcome message
        this.send(ws, {
            type: 'welcome',
            playerId: playerId,
            map: {
                width: this.mapWidth,
                height: this.mapHeight,
                walls: this.walls,
                lootBoxes: this.lootBoxes.filter(b => b.active).map(b => ({
                    id: b.id,
                    x: b.x,
                    y: b.y,
                    type: b.type
                })),
                // Floor tile system
                floorTileSize: this.FLOOR_TILE_SIZE,
                floorGridSize: this.FLOOR_GRID_SIZE,
                destroyedTiles: this.floorTiles.filter(t => !t.active).map(t => ({ gx: t.gx, gy: t.gy }))
            }
        });

        // Notify others
        this.broadcast({
            type: 'playerJoined',
            player: this.getPlayerData(player)
        }, ws);

        console.log(`Player ${player.name} joined (${playerId})`);
    }

    handleInput(ws, data) {
        const player = this.getPlayerBySocket(ws);
        if (!player || !player.alive) return;

        // Apply speed stat: +5% per point
        const baseSpeed = 200;
        const speedMultiplier = 1 + (player.stats?.speed || 0) * 0.05;
        const speed = baseSpeed * speedMultiplier;

        player.vx = data.input.x * speed;
        player.vy = data.input.y * speed;
        player.angle = data.input.angle;
        player.pitch = data.input.pitch || 0;

        // Apply jump with stat: +10% jump height per point
        if (data.input.jump && player.grounded) {
            const baseJump = 500;
            const jumpMultiplier = 1 + (player.stats?.jump || 0) * 0.10;
            player.vHeight = baseJump * jumpMultiplier;
            player.grounded = false;
        }

        // Variable jump: cut jump short when space is released
        if (!data.input.jump && !player.grounded && player.vHeight > 0) {
            player.vHeight = Math.min(player.vHeight, 100); // Cap upward velocity
        }

        // Apply dash with stat: +2.5% dash distance per point
        if (data.input.dash && Date.now() - player.lastDashTime > 800) {
            const baseDash = 200;
            const dashMultiplier = 1 + (player.stats?.dash || 0) * 0.025;
            const dashDist = baseDash * dashMultiplier;

            // If standing still, dash in facing direction
            let dashX = data.input.x * dashDist;
            let dashY = data.input.y * dashDist;

            if (data.input.x === 0 && data.input.y === 0) {
                dashX = Math.sin(player.angle) * dashDist;
                dashY = -Math.cos(player.angle) * dashDist;
            }

            // Apply instantly with collision check (simple)
            const steps = 10;
            const colRadius = 15; // Reduced radius for tighter gaps
            const stepSizeX = dashX / steps;
            const stepSizeY = dashY / steps;

            for (let i = 0; i < steps; i++) {
                const nextX = player.x + stepSizeX;
                const nextY = player.y + stepSizeY;

                // Keep inside arena bounds
                const inBounds = nextX > 20 && nextX < this.mapWidth - 20 && nextY > 20 && nextY < this.mapHeight - 20;

                // Allow dashing if already high enough to be on top of walls
                const isOverWall = player.height >= 100;

                if (inBounds && (isOverWall || !this.checkWallCollision(nextX, nextY, colRadius))) {
                    player.x = nextX;
                    player.y = nextY;
                } else {
                    break;
                }
            }

            player.lastDashTime = Date.now();
        }
    }

    handleShoot(ws, data) {
        const player = this.getPlayerBySocket(ws);
        if (!player || !player.alive) return;

        const now = Date.now();
        const weapon = player.weapon;

        // Check if can shoot
        if (weapon.reloading || weapon.ammo <= 0) return;
        if (now - weapon.lastShootTime < 300) return; // Fire rate

        weapon.ammo--;
        weapon.lastShootTime = now;

        // Create bullet with speed stat: +5% bullet speed per point
        const spawnDist = 30;
        const bulletX = player.x + Math.sin(player.angle) * spawnDist;
        const bulletY = player.y - Math.cos(player.angle) * spawnDist;
        const bulletZ = player.height + 35 + Math.sin(player.pitch) * spawnDist;

        // Aim shake (spread): base spread reduced by aim stat
        const baseSpread = 0.08; // ~4.5 degrees of inaccuracy
        const aimReduction = 1 - Math.min(0.8, (player.stats?.aim || 0) * 0.10); // Max 80% reduction
        const spread = baseSpread * aimReduction;

        // Apply random spread to angle and pitch
        const spreadAngle = player.angle + (Math.random() - 0.5) * spread * 2;
        const spreadPitch = player.pitch + (Math.random() - 0.5) * spread;

        const baseBulletSpeed = 700;
        const bulletSpeedMultiplier = 1 + (player.stats?.speed || 0) * 0.05;
        const bulletSpeed = baseBulletSpeed * bulletSpeedMultiplier;

        const bullet = {
            id: Date.now() + '_' + Math.random(),
            x: bulletX,
            y: bulletY,
            z: bulletZ,
            vx: Math.sin(spreadAngle) * Math.cos(spreadPitch) * bulletSpeed,
            vy: -Math.cos(spreadAngle) * Math.cos(spreadPitch) * bulletSpeed,
            vz: Math.sin(spreadPitch) * bulletSpeed,
            damage: 25,
            ownerId: player.id,
            createdTime: now
        };

        this.bullets.push(bullet);

        // Broadcast bullet
        this.broadcast({
            type: 'bulletFired',
            bullet: {
                id: Date.now() + Math.random(),
                x: bullet.x,
                y: bullet.y,
                z: bullet.z,
                vx: bullet.vx,
                vy: bullet.vy,
                vz: bullet.vz,
                angle: player.angle,
                ownerId: player.id
            }
        });

        // Auto reload if empty
        if (weapon.ammo === 0) {
            weapon.reloading = true;
            weapon.reloadStartTime = now;
        }
    }

    handleReload(ws) {
        const player = this.getPlayerBySocket(ws);
        if (!player || !player.alive) return;

        const weapon = player.weapon;
        if (weapon.reloading || weapon.ammo === weapon.maxAmmo) return;

        weapon.reloading = true;
        weapon.reloadStartTime = Date.now();
    }

    update(deltaTime) {
        // Update Bots AI
        const now = Date.now();
        for (const [id, player] of this.players) {
            if (!player.isBot || !player.alive) continue;

            // Simple AI Logic
            player.patrolTime -= deltaTime;

            // Find target
            let closestTarget = null;
            let minDist = 600;

            for (const [otherId, other] of this.players) {
                if (otherId === id || !other.alive) continue;
                const dx = other.x - player.x;
                const dy = other.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closestTarget = other;
                }
            }

            if (closestTarget) {
                // Chase and aim
                const dx = closestTarget.x - player.x;
                const dy = closestTarget.y - player.y;
                const targetAngle = Math.atan2(dx, -dy);

                // Smooth rotate towards target
                let angleDiff = targetAngle - player.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                player.angle += angleDiff * deltaTime * 5;

                // Move towards target if too far
                if (minDist > 150) {
                    player.vx = Math.sin(player.angle) * 150;
                    player.vy = -Math.cos(player.angle) * 150;
                } else {
                    player.vx = 0;
                    player.vy = 0;
                }

                // Shoot if aimed well
                if (Math.abs(angleDiff) < 0.2 && now - player.weapon.lastShootTime > 800) {
                    this.botShoot(player);
                }
            } else {
                // Patrolling
                if (player.patrolTime <= 0) {
                    player.patrolAngle = Math.random() * Math.PI * 2;
                    player.patrolTime = 2 + Math.random() * 3;
                }

                player.angle = player.patrolAngle;
                player.vx = Math.sin(player.angle) * 100;
                player.vy = -Math.cos(player.angle) * 100;

                // If hitting wall, change direction
                if (this.checkWallCollision(player.x + player.vx * 0.1, player.y + player.vy * 0.1, 20)) {
                    player.patrolTime = 0;
                }
            }
        }

        // Update players
        for (const [id, player] of this.players) {
            if (!player.alive) continue;

            // Check if player is slowed (leg shot debuff)
            const isSlowed = now < player.slowedUntil;
            const speedMultiplier = isSlowed ? 0.5 : 1.0;

            // Move player
            const nextX = player.x + player.vx * deltaTime * speedMultiplier;
            const nextY = player.y + player.vy * deltaTime * speedMultiplier;
            const radius = 15; // Reduced from 20 for tighter collision

            // Wall collision only applies if player is below wall height
            // Walls are 100 units tall, so if player height >= 100, they can walk on top
            const canPassOverWalls = player.height >= 100;

            // Collision detection for X
            if (canPassOverWalls || !this.checkWallCollision(nextX, player.y, radius)) {
                player.x = nextX;
            }

            // Collision detection for Y
            if (canPassOverWalls || !this.checkWallCollision(player.x, nextY, radius)) {
                player.y = nextY;
            }

            // Apply height physics (gravity)
            if (!player.grounded || player.height > 0) {
                player.vHeight -= 1200 * deltaTime; // Gravity
                player.height += player.vHeight * deltaTime;

                // Check if player is above a wall (for landing on top)
                const isOverWall = this.checkWallCollision(player.x, player.y, 15);
                const wallTopHeight = 100; // Walls are 100 units tall

                if (isOverWall && player.height <= wallTopHeight && player.vHeight < 0) {
                    // Land on top of wall
                    player.height = wallTopHeight;
                    player.vHeight = 0;
                    player.grounded = true;
                } else if (!isOverWall && player.height <= 0) {
                    // Land on floor
                    player.height = 0;
                    player.vHeight = 0;
                    player.grounded = true;
                }
            } else {
                // Check if player walked off wall
                const isOverWall = this.checkWallCollision(player.x, player.y, 15);
                if (!isOverWall && player.height > 0) {
                    player.grounded = false; // Start falling
                }
            }

            // Clamp to map bounds (fallback)
            player.x = Math.max(50, Math.min(this.mapWidth - 50, player.x));
            player.y = Math.max(50, Math.min(this.mapHeight - 50, player.y));

            // Health regeneration (5 HP/s after 5 seconds without damage)
            if (player.health < player.maxHealth && now - player.lastDamageTime > 5000) {
                player.health = Math.min(player.maxHealth, player.health + 5 * deltaTime);
            }

            // Update weapon reload
            if (player.weapon.reloading) {
                const elapsed = now - player.weapon.reloadStartTime;
                if (elapsed >= 1500) { // Reload time
                    // Apply ammo stat to maxAmmo each reload
                    player.weapon.maxAmmo = 12 + (player.stats?.ammo || 0) * 2;
                    player.weapon.ammo = player.weapon.maxAmmo;
                    player.weapon.reloading = false;
                }
            }

            // Check for loot box pickup
            this.checkLootBoxPickup(player);

            // Check if player is over a destroyed floor tile (DISABLED)
            // this.checkPlayerFalling(player);
        }

        // Update loot box respawns
        this.updateLootBoxes();

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];

            bullet.x += bullet.vx * deltaTime;
            bullet.y += bullet.vy * deltaTime;
            bullet.z += (bullet.vz || 0) * deltaTime;

            // 1. Out of bounds or too old
            if (bullet.x < 0 || bullet.x > this.mapWidth ||
                bullet.y < 0 || bullet.y > this.mapHeight ||
                Date.now() - bullet.createdTime > 2000) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 2. Check wall collision
            let hitWall = false;
            for (let j = this.walls.length - 1; j >= 0; j--) {
                const wall = this.walls[j];
                // Check if bullet point is inside wall 3D volume
                if (bullet.x >= wall.x && bullet.x <= wall.x + wall.width &&
                    bullet.y >= wall.y && bullet.y <= wall.y + wall.height &&
                    bullet.z >= 0 && bullet.z <= 100) {

                    hitWall = true;
                    if (wall.isDestructible) {
                        wall.health--;
                        if (wall.health <= 0) {
                            const wallId = wall.id;
                            const wallData = { ...wall };
                            this.walls.splice(j, 1);
                            setTimeout(() => {
                                wallData.health = 3;
                                this.walls.push(wallData);
                                this.broadcast({ type: 'wallRegenerated', wall: wallData });
                            }, 30000);
                            this.broadcast({ type: 'wallDestroyed', wallId: wallId });
                        }
                    }
                    break;
                }
            }

            if (hitWall) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 3. Check floor collision
            if (bullet.z <= 0) {
                // this.damageFloorTile(bullet.x, bullet.y, 1); // DISABLED
                this.bullets.splice(i, 1);
                continue;
            }

            // 4. Check player collisions
            let bulletRemoved = false;
            for (const [id, player] of this.players) {
                if (bullet.ownerId === id || !player.alive) continue;

                const dx = bullet.x - player.x;
                const dy = bullet.y - player.y;
                const bulletHeight = bullet.z - (player.height || 0);
                const dist2D = Math.sqrt(dx * dx + dy * dy);

                // Hit Box: 25 radius, 0-50 height
                if (dist2D < 25 && bulletHeight >= 0 && bulletHeight <= 50) {
                    let hitZone = 'body';
                    let damageMultiplier = 1.0;

                    // HEADSHOT Check
                    if (bulletHeight >= 30) {
                        hitZone = 'head';
                        const attacker = this.players.get(bullet.ownerId);
                        const isBotAttacker = attacker && attacker.isBot;

                        // Headshots are Mega-Lethal for humans (40x), but balanced for bots (2x)
                        damageMultiplier = isBotAttacker ? 2.0 : 40.0;
                    } else if (bulletHeight < 12) {
                        hitZone = 'legs';
                        player.slowedUntil = Date.now() + 2000;
                    }

                    const finalDamage = bullet.damage * damageMultiplier;
                    player.health -= finalDamage;
                    player.lastDamageTime = Date.now();

                    // Notify victim
                    if (player.socket) {
                        this.send(player.socket, { type: 'playerHit', damage: finalDamage, hitZone: hitZone });
                    }

                    // Notify attacker (for SFX/Hitmarkers)
                    const attacker = this.players.get(bullet.ownerId);
                    if (attacker && attacker.socket) {
                        this.send(attacker.socket, { type: 'hitConfirm', hitZone: hitZone, damage: finalDamage });
                    }

                    // Kill logic
                    if (player.health <= 0) {
                        player.health = 0;
                        player.alive = false;
                        player.deaths++;
                        player.killStreak = 0;
                        this.updateLeaderboard(player);

                        if (attacker) {
                            attacker.kills++;
                            attacker.killStreak++;
                            if (attacker.killStreak > attacker.highestKillStreak) attacker.highestKillStreak = attacker.killStreak;

                            let xpGain = 100 + (attacker.killStreak - 1) * 50;
                            if (hitZone === 'head') xpGain += 50;
                            attacker.xp += xpGain;

                            const oldLevel = attacker.level;
                            attacker.level = Math.floor(Math.sqrt(attacker.xp / 100)) + 1;
                            if (attacker.level > oldLevel) {
                                const lvls = attacker.level - oldLevel;
                                attacker.skillPoints += lvls * 2;
                                if (attacker.socket) this.send(attacker.socket, { type: 'levelUp', level: attacker.level, skillPoints: attacker.skillPoints, newPoints: lvls * 2 });
                            }
                            this.updateLeaderboard(attacker);
                            this.broadcast({ type: 'playerKilled', killer: this.getPlayerData(attacker), victim: this.getPlayerData(player), weapon: 'PISTOL', hitZone: hitZone, xpGain: xpGain, killStreak: attacker.killStreak });
                            console.log(`[Kill] ${attacker.name} -> ${player.name} (${hitZone})`);
                        }

                        setTimeout(() => {
                            if (this.players.has(id)) {
                                const sp = this.getRandomSpawnPoint();
                                player.x = sp.x; player.y = sp.y;
                                player.maxHealth = 100 + (player.stats?.health || 0) * 10;
                                player.health = player.maxHealth;
                                player.weapon.maxAmmo = 12 + (player.stats?.ammo || 0) * 2;
                                player.weapon.ammo = player.weapon.maxAmmo;
                                player.alive = true;
                                player.slowedUntil = 0;
                            }
                        }, 3000);
                    }

                    this.bullets.splice(i, 1);
                    bulletRemoved = true;
                    break;
                }
            }
        }
    }

    botShoot(player) {
        const now = Date.now();
        const weapon = player.weapon;

        if (weapon.reloading || weapon.ammo <= 0) {
            if (weapon.ammo <= 0 && !weapon.reloading) {
                weapon.reloading = true;
                weapon.reloadStartTime = now;
            }
            return;
        }

        // Find target for pitching
        let target = null;
        let minDist = 1000;
        for (const [id, p] of this.players) {
            if (id === player.id || !p.alive) continue;
            const dist = Math.sqrt((p.x - player.x) ** 2 + (p.y - player.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                target = p;
            }
        }

        if (!target) return;

        weapon.ammo--;
        weapon.lastShootTime = now;

        // Human-like aiming:
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const dist = Math.max(10, Math.sqrt(dx * dx + dy * dy));

        // Random headshot chance: 5-25%
        const headshotChance = 0.05 + Math.random() * 0.20;
        const aimHeight = (Math.random() < headshotChance) ? 40 : 15; // Aim head (40) or body (15)

        const bulletX = player.x + Math.sin(player.angle) * 30;
        const bulletY = player.y - Math.cos(player.angle) * 30;
        const bulletZ = player.height + 25; // Bot muzzle height

        // Calculate pitch to hit target height
        const dz = ((target.height || 0) + aimHeight) - bulletZ;
        const targetPitch = Math.atan2(dz, dist);

        // Natural aiming errors (Human-like)
        const yawError = (Math.random() - 0.5) * 0.15; // Yaw wobble
        const pitchError = (Math.random() - 0.5) * 0.1;  // Pitch wobble

        const muzzleAngle = player.angle + yawError;
        const muzzlePitch = targetPitch + pitchError;

        const bullet = {
            id: Date.now() + '_' + Math.random(),
            x: bulletX,
            y: bulletY,
            z: bulletZ,
            vx: Math.sin(muzzleAngle) * Math.cos(muzzlePitch) * 700,
            vy: -Math.cos(muzzleAngle) * Math.cos(muzzlePitch) * 700,
            vz: Math.sin(muzzlePitch) * 700,
            damage: 10,
            ownerId: player.id,
            createdTime: now
        };

        this.bullets.push(bullet);

        this.broadcast({
            type: 'bulletFired',
            bullet: {
                id: bullet.id,
                x: bullet.x, y: bullet.y, z: bullet.z,
                vx: bullet.vx, vy: bullet.vy, vz: bullet.vz,
                angle: muzzleAngle, ownerId: player.id
            }
        });
    }

    broadcast(data, exclude = null) {
        const message = JSON.stringify(data);
        for (const [id, player] of this.players) {
            if (player.socket && player.socket !== exclude && player.socket.readyState === WebSocket.OPEN) {
                player.socket.send(message);
            }
        }
    }

    send(ws, data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    sendGameState() {
        const state = {
            type: 'gameState',
            state: {
                players: {}
            }
        };

        for (const [id, player] of this.players) {
            state.state.players[id] = this.getPlayerData(player);
        }

        for (const [id, player] of this.players) {
            if (player.socket) {
                this.send(player.socket, state);
            }
        }
    }

    getPlayerData(player) {
        return {
            id: player.id,
            isBot: !!player.isBot,
            name: player.name,
            x: player.x,
            y: player.y,
            height: player.height || 0, // Vertical position for jumping
            angle: player.angle,
            pitch: player.pitch || 0,
            health: player.health,
            alive: player.alive,
            grounded: !!player.grounded,
            kills: player.kills,
            deaths: player.deaths,
            color: player.color,
            ammo: player.weapon.ammo,
            reloading: player.weapon.reloading,
            isDashing: (Date.now() - (player.lastDashTime || 0)) < 300,
            isSlowed: Date.now() < (player.slowedUntil || 0),
            // Leveling system
            xp: player.xp || 0,
            level: player.level || 1,
            killStreak: player.killStreak || 0,
            // Skill point system
            skillPoints: player.skillPoints || 0,
            stats: player.stats || { speed: 0, health: 0, ammo: 0, jump: 0, dash: 0, aim: 0 },
            maxHealth: player.maxHealth || 100,
            maxAmmo: player.weapon?.maxAmmo || 12
        };
    }

    handleAllocateStat(ws, data) {
        const player = this.getPlayerBySocket(ws);
        if (!player) return;

        const stat = data.stat;
        const validStats = ['speed', 'health', 'ammo', 'jump', 'dash', 'aim'];

        if (!validStats.includes(stat) || player.skillPoints <= 0) {
            return;
        }

        // Allocate the point
        player.skillPoints--;
        player.stats[stat]++;

        // Apply immediate effects
        if (stat === 'health') {
            const oldMaxHealth = player.maxHealth;
            player.maxHealth = 100 + player.stats.health * 10;
            player.health += (player.maxHealth - oldMaxHealth); // Add the bonus HP now
        }
        if (stat === 'ammo') {
            player.weapon.maxAmmo = 12 + player.stats.ammo * 2;
        }

        // Confirm allocation
        this.send(ws, {
            type: 'statAllocated',
            stat: stat,
            newValue: player.stats[stat],
            skillPoints: player.skillPoints,
            stats: player.stats,
            maxHealth: player.maxHealth,
            maxAmmo: player.weapon.maxAmmo
        });
    }

    getPlayerBySocket(ws) {
        for (const [id, player] of this.players) {
            if (player.socket === ws) return player;
        }
        return null;
    }

    checkWallCollision(x, y, radius) {
        for (const wall of this.walls) {
            // Find the closest point to the circle within the rectangle
            const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
            const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));

            // Calculate the distance between the circle's center and this closest point
            const distanceX = x - closestX;
            const distanceY = y - closestY;

            // If the distance is less than the circle's radius, an intersection occurs
            const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
            if (distanceSquared < (radius * radius)) {
                return true;
            }
        }
        return false;
    }

    randomColor() {
        const colors = ['#ff6b9d', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    startGameLoop() {
        let lastTime = Date.now();

        setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - lastTime) / 1000;
            lastTime = now;

            this.update(deltaTime);
            this.sendGameState();
        }, TICK_INTERVAL);

        console.log(`Game loop started at ${TICK_RATE} ticks per second`);
    }

    spawnLootBoxes() {
        // Spawn loot boxes at all spawn locations
        let boxId = 0;
        for (const spawn of this.lootBoxSpawns) {
            this.lootBoxes.push({
                id: `lootbox_${boxId++}`,
                x: spawn.x,
                y: spawn.y,
                type: this.randomLootType(),
                active: true,
                respawnTime: 0
            });
        }
    }

    randomLootType() {
        const types = ['HEALTH', 'REVOLVER', 'MAGNUM', 'DERRINGER', 'AMMO'];
        return types[Math.floor(Math.random() * types.length)];
    }

    checkLootBoxPickup(player) {
        for (const box of this.lootBoxes) {
            if (!box.active) continue;

            const dx = player.x - box.x;
            const dy = player.y - box.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 30) { // Pickup radius
                // Apply loot effect
                switch (box.type) {
                    case 'HEALTH':
                        player.health = Math.min(player.maxHealth, player.health + 50);
                        break;
                    case 'REVOLVER':
                    case 'MAGNUM':
                    case 'DERRINGER':
                        // Switch weapon
                        player.weapon.type = box.type;
                        player.weapon.ammo = 6;
                        player.weapon.maxAmmo = 6;
                        break;
                    case 'AMMO':
                        player.weapon.ammo = player.weapon.maxAmmo;
                        break;
                }

                // Deactivate and set respawn timer
                box.active = false;
                box.respawnTime = Date.now() + 30000; // 30 second respawn

                // Broadcast pickup
                this.broadcast({
                    type: 'lootBoxPickup',
                    boxId: box.id,
                    playerId: player.id,
                    lootType: box.type
                });
            }
        }
    }

    updateLootBoxes() {
        const now = Date.now();
        for (const box of this.lootBoxes) {
            if (!box.active && now >= box.respawnTime) {
                box.active = true;
                box.type = this.randomLootType();
                this.broadcast({
                    type: 'lootBoxSpawn',
                    box: { id: box.id, x: box.x, y: box.y, type: box.type }
                });
            }
        }
    }

    // Floor tile system - destructible floor
    initFloorTiles() {
        for (let gx = 0; gx < this.FLOOR_GRID_SIZE; gx++) {
            for (let gy = 0; gy < this.FLOOR_GRID_SIZE; gy++) {
                this.floorTiles.push({
                    gx: gx,
                    gy: gy,
                    x: gx * this.FLOOR_TILE_SIZE,
                    y: gy * this.FLOOR_TILE_SIZE,
                    health: 5, // 5 hits to destroy
                    active: true
                });
            }
        }
    }

    getFloorTileAt(x, y) {
        const gx = Math.floor(x / this.FLOOR_TILE_SIZE);
        const gy = Math.floor(y / this.FLOOR_TILE_SIZE);
        if (gx < 0 || gx >= this.FLOOR_GRID_SIZE || gy < 0 || gy >= this.FLOOR_GRID_SIZE) {
            return null;
        }
        return this.floorTiles[gy * this.FLOOR_GRID_SIZE + gx];
    }

    damageFloorTile(x, y, damage) {
        const tile = this.getFloorTileAt(x, y);
        if (!tile || !tile.active) return false;

        tile.health -= damage;
        if (tile.health <= 0) {
            tile.active = false;
            this.broadcast({
                type: 'floorTileDestroyed',
                gx: tile.gx,
                gy: tile.gy
            });
            return true;
        }
        return false;
    }

    checkPlayerFalling(player) {
        if (!player.alive) return;

        const tile = this.getFloorTileAt(player.x, player.y);
        // If no tile or tile is destroyed, player falls
        if (!tile || !tile.active) {
            if (player.grounded) {
                player.grounded = false;
                player.vHeight = 0;
            }

            // Apply gravity for falling into void
            if (player.height < -200) {
                // Fallen too far - instant death
                player.health = 0;
                player.alive = false;
                player.deaths++;
                player.killStreak = 0;

                this.broadcast({
                    type: 'playerFell',
                    player: this.getPlayerData(player)
                });

                // Respawn
                setTimeout(() => {
                    if (this.players.has(player.id)) {
                        const spawn = this.getRandomSpawnPoint();
                        player.x = spawn.x;
                        player.y = spawn.y;
                        player.height = 0;
                        player.health = player.maxHealth;
                        player.alive = true;
                        player.grounded = true;
                    }
                }, 3000);
            }
        }
    }

    // Override spawn point check to ensure solid ground
    // Safe and fully random spawn point
    getRandomSpawnPoint() {
        let attempts = 0;

        while (attempts < 50) {
            // Random point within playable area
            const x = 100 + Math.random() * (this.mapWidth - 200);
            const y = 100 + Math.random() * (this.mapHeight - 200);

            // Check if floor exists (not a hole)
            const tile = this.getFloorTileAt(x, y);

            // Validate: Tile must be active AND not inside a solid wall
            if (tile && tile.active && !this.checkWallCollision(x, y, 40)) {
                return { x, y };
            }
            attempts++;
        }

        // Emergency fallback to defaults if random search fails
        const safeDefaults = [
            { x: 1000, y: 1000 },
            { x: 200, y: 200 },
            { x: 1800, y: 1800 }
        ];
        return safeDefaults[Math.floor(Math.random() * safeDefaults.length)];
    }

    handleSyncStats(ws, data) {
        const player = this.getPlayerBySocket(ws);
        if (!player) return;

        console.log(`Syncing stats for player ${player.name}:`, data.stats);

        const newStats = data.stats || {};

        // Update name if provided
        if (newStats.name && newStats.name.length > 0) {
            player.name = newStats.name;
        }

        // Update core stats
        if (newStats.kills !== undefined) player.kills = Number(newStats.kills);
        if (newStats.deaths !== undefined) player.deaths = Number(newStats.deaths);
        if (newStats.level !== undefined) player.level = Number(newStats.level);
        if (newStats.xp !== undefined) player.xp = Number(newStats.xp);
        if (newStats.skillPoints !== undefined) player.skillPoints = Number(newStats.skillPoints);

        // Update skill stats
        if (newStats.skills) {
            player.stats = {
                speed: Number(newStats.skills.speed || 0),
                health: Number(newStats.skills.health || 0),
                ammo: Number(newStats.skills.ammo || 0),
                jump: Number(newStats.skills.jump || 0),
                dash: Number(newStats.skills.dash || 0),
                aim: Number(newStats.skills.aim || 0)
            };
        }

        // Apply health changes immediately if maxHealth changed
        const newMaxHealth = 100 + (player.stats.health * 10);
        if (player.maxHealth !== newMaxHealth) {
            player.maxHealth = newMaxHealth;
            player.health = Math.min(player.health, player.maxHealth);
        }

        // Apply ammo changes
        player.weapon.maxAmmo = 12 + (player.stats.ammo * 2);
        player.weapon.ammo = Math.min(player.weapon.ammo, player.weapon.maxAmmo);

        // Broadcast the update so the client sees their new stats in the UI
        this.broadcast({
            type: 'gameState',
            players: { [player.id]: this.getPlayerData(player) }
        });
    }

    // Leaderboard persistence methods
    loadLeaderboard() {
        try {
            if (fs.existsSync(this.leaderboardPath)) {
                const data = fs.readFileSync(this.leaderboardPath, 'utf8');
                this.leaderboardData = JSON.parse(data);
            } else {
                this.leaderboardData = { players: [], lastUpdate: null };
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.leaderboardData = { players: [], lastUpdate: null };
        }
    }

    saveLeaderboard() {
        try {
            this.leaderboardData.lastUpdate = new Date().toISOString();
            fs.writeFileSync(this.leaderboardPath, JSON.stringify(this.leaderboardData, null, 2));
        } catch (error) {
            console.error('Error saving leaderboard:', error);
        }
    }

    updateLeaderboard(player) {
        if (!player || player.isBot) return; // Don't track bots

        const existingIdx = this.leaderboardData.players.findIndex(p => p.name === player.name);

        const playerData = {
            name: player.name,
            level: player.level || 1,
            kills: player.kills || 0,
            deaths: player.deaths || 0,
            xp: (player.kills || 0) * 100, // 100 XP per kill
            wallet: existingIdx >= 0 ? this.leaderboardData.players[existingIdx].wallet : null,
            lastPlayed: new Date().toISOString()
        };

        if (existingIdx >= 0) {
            // Update existing player (keep best stats)
            const existing = this.leaderboardData.players[existingIdx];
            this.leaderboardData.players[existingIdx] = {
                ...playerData,
                kills: Math.max(existing.kills, playerData.kills),
                deaths: Math.max(existing.deaths, playerData.deaths),
                level: Math.max(existing.level, playerData.level),
                xp: Math.max(existing.xp, playerData.xp)
            };
        } else {
            this.leaderboardData.players.push(playerData);
        }

        // Sort by XP descending
        this.leaderboardData.players.sort((a, b) => b.xp - a.xp);

        // Keep top 1000 players
        if (this.leaderboardData.players.length > 1000) {
            this.leaderboardData.players = this.leaderboardData.players.slice(0, 1000);
        }

        this.saveLeaderboard();
    }

    getLeaderboard(limit = 100) {
        return this.leaderboardData.players.slice(0, limit).map((player, idx) => ({
            rank: idx + 1,
            name: player.name,
            level: player.level,
            kills: player.kills,
            deaths: player.deaths,
            points: player.xp,
            hasWallet: !!player.wallet
        }));
    }

    linkWallet(playerName, walletAddress) {
        const player = this.leaderboardData.players.find(p => p.name === playerName);
        if (player) {
            player.wallet = walletAddress;
            this.saveLeaderboard();
            return true;
        }
        return false;
    }
}

// Start server
new GameServer();

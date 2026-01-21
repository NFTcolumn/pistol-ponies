// Main Game class for FPS
import { GameConfig } from '/js/config/GameConfig.js';
import { Renderer } from '/js/engine/Renderer.js';
import { Input } from '/js/engine/Input.js';
import { Player } from '/js/entities/Player.js';
import { HUD } from '/js/ui/HUD.js';
import { Menu, Scoreboard } from '/js/ui/Menu.js';
import { IngameMenu } from '/js/ui/IngameMenu.js';
import { NetworkManager } from '/js/network/NetworkManager.js';
import { MobileControls } from '/js/ui/MobileControls.js';
import { GamepadController } from '/js/engine/GamepadController.js';
import { WalletManager } from '/js/wallet/WalletManager.js';
import { ContractManager } from '/js/wallet/ContractManager.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.uiCanvas = document.getElementById('uiCanvas');
        this.renderer = new Renderer(this.canvas);
        this.input = new Input(this.canvas);

        this.hud = new HUD(this.uiCanvas);
        this.menu = new Menu();
        this.scoreboard = new Scoreboard();
        this.ingameMenu = new IngameMenu();

        this.wallet = new WalletManager();
        this.contracts = new ContractManager(this.wallet);

        this.network = new NetworkManager(this);

        this.localPlayer = null;
        this.players = new Map(); // Store player objects
        this.playerMeshes = new Map(); // Store Three.js meshes
        this.mapData = null; // Store map for HUD

        this.gameState = 'menu';
        this.lastTime = performance.now();
        this.lastShootTime = 0;

        // Sleep/wake robustness
        this.gamePaused = false;

        // Mobile controls
        this.mobileControls = new MobileControls(this);

        // Gamepad controller (Xbox/Bluetooth)
        this.gamepad = new GamepadController(this);

        // Resize UI canvas
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.setupMenuEvents();
        this.setupScoreboard();
        this.setupVisibilityHandlers(); // Sleep/wake handling

        // Expose for debugging
        window.game = this;

        this.run();
    }

    setupMenuEvents() {
        document.getElementById('playButton').addEventListener('click', () => {
            const nameInput = document.getElementById('playerName');
            if (nameInput.value.trim()) {
                this.menu.setPlayerName(nameInput.value.trim());
            }
            this.startMultiplayer();
        });

        // Settings button
        document.getElementById('settingsButton').addEventListener('click', () => {
            this.menu.showSettings();
        });

        // Back button in settings
        document.getElementById('backButton').addEventListener('click', () => {
            this.menu.showMainMenu();
        });

        // Floor texture change
        document.getElementById('floorTexture').addEventListener('change', (e) => {
            this.renderer.updateFloorTexture(e.target.value);
        });

        // Other menu events...
        document.getElementById('playerName').value = this.menu.getPlayerName();

        // Mobile settings button
        document.getElementById('mobileSettingsButton').addEventListener('click', () => {
            this.mobileControls.openSettings();
        });

        // Wallet connection
        this.setupWalletEvents();
    }

    setupWalletEvents() {
        // connectBtn is now in the ESC menu
        const connectBtn = document.getElementById('menuConnectBtn');

        if (connectBtn) {
            connectBtn.addEventListener('click', async () => {
                try {
                    // Default to Base (8453)
                    const selectedChain = 8453;

                    const result = await this.wallet.connect();

                    // Switch to selected chain if different
                    if (this.wallet.chainId !== selectedChain) {
                        await this.wallet.switchChain(selectedChain);
                    }

                    this.updateWalletUI(true);
                } catch (error) {
                    console.error('Wallet connection error:', error);
                }
            });
        }
    }

    updateWalletUI(connected) {
        // Update both the dot and text in the ESC menu
        this.ingameMenu.updateWalletStatus(connected, this.wallet.address);

        // Also show/hide the connect button
        const connectBtn = document.getElementById('menuConnectBtn');
        if (connectBtn) {
            connectBtn.style.display = connected ? 'none' : 'inline-block';
        }
    }

    setupScoreboard() {
        window.addEventListener('keydown', (e) => {
            // ESC to toggle in-game menu
            if (e.code === 'Escape') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.toggleIngameMenu();
                }
            }

            if (e.code === 'Tab') {
                e.preventDefault();
                if (this.gameState === 'playing' && !this.ingameMenu.isVisible()) {
                    this.scoreboard.show();
                }
            }

            // Skill point allocation with 1-5 keys
            if (this.gameState === 'playing' && this.localPlayer?.skillPoints > 0) {
                const statMap = {
                    'Digit1': 'speed',
                    'Digit2': 'health',
                    'Digit3': 'ammo',
                    'Digit4': 'jump',
                    'Digit5': 'dash',
                    'Digit6': 'aim'
                };

                if (statMap[e.code]) {
                    this.network.send({
                        type: 'allocateStat',
                        stat: statMap[e.code]
                    });
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Tab') {
                e.preventDefault();
                this.scoreboard.hide();
            }
        });
    }

    startMultiplayer() {
        this.menu.hide();
        this.uiCanvas.style.display = 'block';
        this.gameState = 'playing'; // Skip lobby for now to get into the action
        this.input.setGameActive(true); // Enable game input handling
        this.mobileControls.show(); // Show mobile controls if on mobile
        this.network.connect();
        this.setupIngameMenu(); // Setup in-game menu callbacks
    }

    setupIngameMenu() {
        this.ingameMenu.setupEvents({
            onResumeGame: () => {
                this.ingameMenu.hide();
                this.input.setGameActive(true);
            },
            onSaveGame: async () => {
                if (!this.localPlayer) throw new Error('Player not initialized');
                if (!this.wallet.connected) throw new Error('Wallet not connected');

                // Build stats object with skillPoints included
                const stats = {
                    speed: this.localPlayer.stats?.speed || 0,
                    health: this.localPlayer.stats?.health || 0,
                    ammo: this.localPlayer.stats?.ammo || 0,
                    jump: this.localPlayer.stats?.jump || 0,
                    dash: this.localPlayer.stats?.dash || 0,
                    aim: this.localPlayer.stats?.aim || 0,
                    skillPoints: this.localPlayer.skillPoints || 0
                };

                const playerData = {
                    name: this.localPlayer.name,
                    kills: this.localPlayer.kills,
                    deaths: this.localPlayer.deaths,
                    level: this.localPlayer.level,
                    xp: this.localPlayer.xp || 0,
                    stats: stats,
                    matches: this.localPlayer.matches || {}
                };

                console.log('Saving game data:', playerData);
                await this.contracts.saveGame(playerData);
            },
            onLoadGame: async () => {
                if (!this.wallet.connected) throw new Error('Wallet not connected');

                const savedData = await this.contracts.loadGame();
                if (!savedData) throw new Error('No saved game found');

                console.log('[Load] Saved data received:', savedData);
                console.log('[Load] localPlayer exists:', !!this.localPlayer);

                // Update local player stats
                if (this.localPlayer) {
                    // Sync name from blockchain
                    if (savedData.name) {
                        this.localPlayer.name = savedData.name;
                    }

                    this.localPlayer.kills = savedData.kills || 0;
                    this.localPlayer.deaths = savedData.deaths || 0;
                    this.localPlayer.level = savedData.level || 1;
                    this.localPlayer.xp = savedData.xp || 0;

                    console.log('[Load] Applied to localPlayer - level:', this.localPlayer.level, 'kills:', this.localPlayer.kills);

                    if (savedData.stats) {
                        this.localPlayer.stats = { ...this.localPlayer.stats, ...savedData.stats };
                        this.localPlayer.skillPoints = savedData.stats.skillPoints || 0;
                        console.log('[Load] Applied stats:', this.localPlayer.stats);
                    }

                    // Update in-game menu display immediately with all stats
                    this.ingameMenu.updateStats({
                        name: this.localPlayer.name,
                        kills: this.localPlayer.kills,
                        level: this.localPlayer.level,
                        deaths: this.localPlayer.deaths,
                        skillPoints: this.localPlayer.skillPoints,
                        stats: this.localPlayer.stats
                    });

                    // Prevent local stats from being overwritten by server for a moment
                    this.isSyncingStats = true;
                    setTimeout(() => { this.isSyncingStats = false; }, 5000); // Extended to 5 seconds

                    // Tell backend about loaded stats including skills and name
                    const syncPayload = {
                        type: 'syncStats',
                        stats: {
                            name: this.localPlayer.name, // Include name!
                            kills: this.localPlayer.kills,
                            deaths: this.localPlayer.deaths,
                            level: this.localPlayer.level,
                            xp: this.localPlayer.xp,
                            skillPoints: savedData.stats?.skillPoints || 0,
                            skills: savedData.stats // speed, health, ammo, jump, dash, aim
                        }
                    };
                    console.log('[Load] Sending syncStats to server:', syncPayload);
                    this.network.send(syncPayload);
                    console.log('[Load] syncStats sent successfully');
                }
            },
            onQuitGame: () => {
                this.ingameMenu.hide();
                this.network.disconnect();
                this.gameState = 'menu';
                this.mobileControls.hide();
                this.menu.show();
                this.localPlayer = null;
                this.players.clear();
                this.playerMeshes.forEach(mesh => this.renderer.scene.remove(mesh));
                this.playerMeshes.clear();
            }
        });
    }

    toggleIngameMenu() {
        if (!this.localPlayer) return;

        const playerData = {
            name: this.localPlayer.name,
            kills: this.localPlayer.kills,
            deaths: this.localPlayer.deaths,
            level: this.localPlayer.level,
            skillPoints: this.localPlayer.skillPoints,
            stats: this.localPlayer.stats || { speed: 0, health: 0, ammo: 0, jump: 0, dash: 0, aim: 0 }
        };

        const menuOpened = this.ingameMenu.toggle(
            playerData,
            this.wallet?.connected || false,
            this.wallet?.address || ''
        );

        // Pause/resume game input when menu is toggled
        this.input.setGameActive(!menuOpened);
    }

    onGameState(state) {
        // Update/create players
        for (const [id, data] of Object.entries(state.players)) {
            let player = this.players.get(id);

            if (!player) {
                player = new Player(data.id, data.name, data.x, data.y, data.color);
                this.players.set(id, player);

                // Create 3D mesh for the player
                const mesh = this.renderer.createPonyMesh(data.color);
                this.renderer.scene.add(mesh);
                this.playerMeshes.set(id, mesh);

                if (id === this.network.playerId) {
                    this.localPlayer = player;
                    mesh.visible = false; // Hide local player mesh for FPS
                }
            }

            // Sync data from server
            player.x = data.x;
            player.y = data.y;
            player.height = data.height || 0;

            // Only update remote player angles from server to prevent jitter 
            // but we need to keep local angle for sending back to server
            if (id !== this.network.playerId) {
                player.angle = data.angle;
                player.pitch = data.pitch || 0;
            }

            player.health = data.health;
            player.alive = data.alive;

            // Sync XP and level system
            if (!this.isSyncingStats || id !== this.network.playerId) {
                player.kills = data.kills;
                player.deaths = data.deaths;
                player.xp = data.xp || 0;
                player.level = data.level || 1;
                player.killStreak = data.killStreak || 0;
                player.skillPoints = data.skillPoints || 0;
                player.stats = data.stats || { speed: 0, health: 0, ammo: 0, jump: 0, dash: 0, aim: 0 };
                player.maxHealth = data.maxHealth || 100;
                player.maxAmmo = data.maxAmmo || 12;
            }

            // Sync weapon state
            if (player.weapon) {
                player.weapon.ammo = data.ammo;
                player.weapon.reloading = data.reloading;
                player.weapon.maxAmmo = data.maxAmmo || 12;
            }
        }

        // Cleanup disconnected players
        for (const [id, player] of this.players) {
            if (!state.players[id]) {
                const mesh = this.playerMeshes.get(id);
                if (mesh) this.renderer.scene.remove(mesh);
                this.playerMeshes.delete(id);
                this.players.delete(id);
            }
        }
    }

    update(deltaTime) {
        if (this.gameState !== 'playing' || !this.localPlayer) return;

        // Update gamepad state
        this.gamepad.update();

        // Build input overrides for Player (mobile OR gamepad)
        let inputOverrides = null;

        // Check gamepad first (takes priority if active)
        if (this.gamepad.enabled && (this.gamepad.leftStick.x !== 0 || this.gamepad.leftStick.y !== 0 ||
            this.gamepad.rightStick.x !== 0 || this.gamepad.rightStick.y !== 0)) {
            const gamepadMove = this.gamepad.getMovementVector();
            const gamepadAim = this.gamepad.getAimDelta();

            inputOverrides = {
                movement: gamepadMove,
                aimDelta: gamepadAim
            };

            // Handle gamepad stat allocation
            const gamepadStat = this.gamepad.getStatInput();
            if (gamepadStat && this.localPlayer.skillPoints > 0) {
                this.network.send({
                    type: 'allocateStat',
                    stat: gamepadStat
                });
            }
        }
        // Fall back to mobile controls
        else if (this.mobileControls.enabled) {
            // Get movement from joystick
            const joystickMove = this.mobileControls.moveJoystick.active
                ? this.mobileControls.getMovementVector()
                : null;

            // Get aim from joystick
            const aimDelta = this.mobileControls.getAimDelta();

            if (joystickMove || aimDelta) {
                inputOverrides = {
                    movement: joystickMove,
                    aimDelta: aimDelta
                };
            }

            // Show/hide stat buttons based on available skill points
            if (this.localPlayer.skillPoints > 0) {
                this.mobileControls.showStatButtons();
            } else {
                this.mobileControls.hideStatButtons();
            }

            // Handle mobile stat allocation
            const statToAllocate = this.mobileControls.consumeStat();
            if (statToAllocate && this.localPlayer.skillPoints > 0) {
                this.network.send({
                    type: 'allocateStat',
                    stat: statToAllocate
                });
            }

            // Handle mobile flick-to-dash
            if (this.mobileControls.getDash()) {
                this.localPlayer.isDashing = true;
                setTimeout(() => { if (this.localPlayer) this.localPlayer.isDashing = false; }, 200);
            }
        }



        // Player logic - pass input overrides
        this.localPlayer.update(deltaTime, this.input, inputOverrides);

        this.renderer.updateBullets(deltaTime);

        // Get movement from keyboard, mobile joystick, or gamepad
        let movement = this.input.getMovementVector();
        if (this.gamepad.enabled && this.gamepad.leftStick.x !== 0 || this.gamepad.leftStick.y !== 0) {
            const gpMove = this.gamepad.getMovementVector();
            movement.x = gpMove.x;
            movement.z = gpMove.z;
        } else if (this.mobileControls.enabled && this.mobileControls.moveJoystick.active) {
            const mobileMove = this.mobileControls.getMovementVector();
            movement.x = mobileMove.x;
            movement.z = mobileMove.z;
        }

        // Get dash from keyboard or gamepad
        const desktopDash = this.input.getAndResetDash();
        const gamepadDash = this.gamepad.consumeDash();

        // Check for dash from keyboard, mobile, or gamepad
        let dashTriggered = !!desktopDash;
        if (this.mobileControls.enabled && this.mobileControls.getDash()) {
            dashTriggered = true;
        }
        if (gamepadDash) {
            dashTriggered = true;
        }

        // Check for jump from keyboard, mobile, or gamepad
        // Use isJumpHeld (not consume) so server variable jump works correctly
        let jumpPressed = this.input.isKeyDown('Space');
        if (this.mobileControls.enabled && this.mobileControls.isJumpHeld()) {
            jumpPressed = true;
        }
        if (this.gamepad.enabled && this.gamepad.isJumpHeld()) {
            jumpPressed = true;
        }

        // We'll normalize what we send to match expected server speeds
        this.network.sendInput({
            x: this.localPlayer.vx / this.localPlayer.speed,
            y: this.localPlayer.vy / this.localPlayer.speed,
            angle: this.localPlayer.angle,
            pitch: this.localPlayer.pitch,
            jump: jumpPressed,
            dash: dashTriggered
        });

        // Set local isDashing flag for VFX (speed lines, FOV change)
        if (dashTriggered) {
            this.localPlayer.isDashing = true;
            setTimeout(() => { if (this.localPlayer) this.localPlayer.isDashing = false; }, 200);
        }


        // Shooting (keyboard/mouse, mobile, or gamepad)
        const shouldShoot = this.input.isMouseButtonDown(0) ||
            (this.mobileControls.enabled && this.mobileControls.isShootHeld()) ||
            this.gamepad.isShootHeld();
        if (shouldShoot) {
            const now = Date.now();
            if (now - this.lastShootTime > 300) {
                this.network.sendShoot(this.localPlayer.angle);
                this.renderer.addShake(5);
                this.lastShootTime = now;
            }
        }

        // Reload (keyboard, mobile, or gamepad)
        const shouldReload = this.input.isKeyDown('KeyR') || this.input.isKeyDown('KeyQ') ||
            (this.mobileControls.enabled && this.mobileControls.consumeReload()) ||
            this.gamepad.isReloadPressed();
        if (shouldReload) {
            this.network.sendReload();
        }

        this.renderer.updateCamera(this.localPlayer);
        this.updateEntities(deltaTime);
        this.input.clearMovementDelta();
    }

    updateEntities(deltaTime) {
        for (const [id, player] of this.players) {
            const mesh = this.playerMeshes.get(id);
            if (!mesh) continue;

            // Update mesh position and rotation
            mesh.position.set(player.x, player.height, player.y);
            mesh.rotation.y = -player.angle;
            mesh.visible = player.alive && (id !== this.network.playerId);

            // Update animation
            this.renderer.updatePlayerAnimation(mesh, player, deltaTime);
        }
    }

    resize() {
        this.uiCanvas.width = window.innerWidth;
        this.uiCanvas.height = window.innerHeight;
    }

    run() {
        const currentTime = performance.now();
        // Clamp delta time to 33ms max (~30 FPS minimum) to prevent physics explosion after sleep
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
        this.lastTime = currentTime;

        // Skip game updates but keep loop alive when paused (tab hidden/sleeping)
        if (!this.gamePaused) {
            this.update(deltaTime);
            this.hud.update(deltaTime); // Update HUD for vignette decay
            this.renderer.render();

            // Draw UI
            const ctx = this.uiCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
            this.hud.draw(ctx, this.localPlayer, this.players, this.mapData);

            // Draw scoreboard if visible (convert Map to Array of player values)
            if (this.scoreboard.visible) {
                const playersArray = Array.from(this.players.values());
                this.scoreboard.draw(ctx, playersArray, this.uiCanvas);
            }
        }

        requestAnimationFrame(() => this.run());
    }

    // Stubs for message handlers from network
    onPlayerJoined(id, mapData) {
        if (mapData) {
            this.mapData = mapData;
            this.renderer.setupMap(mapData);
            this.renderer.initFloorTiles(mapData);
        }
    }
    onOtherPlayerJoined(data) { }
    onPlayerLeft(id) { }
    onPlayerKilled(killer, victim, weapon) {
        this.hud.addKill(killer.name, victim.name, weapon);
    }
    onBulletFired(bullet) {
        const color = bullet.ownerId === this.network.playerId ? 0xffea00 : 0xff3333;
        this.renderer.addBullet(bullet, color);
    }
    onWallDestroyed(wallId) {
        this.renderer.removeWall(wallId);
        // Also remove from mapData if we want to update minimap
        if (this.mapData) {
            this.mapData.walls = this.mapData.walls.filter(w => w.id !== wallId);
        }
    }
    onPlayerHit(damage, hitZone) {
        // Trigger red vignette effect when hit
        this.hud.triggerHitVignette();
        this.renderer.addShake(damage / 5); // Shake based on damage
    }
    onFloorTileDestroyed(gx, gy) {
        this.renderer.removeFloorTile(gx, gy);
    }
    onPlayerFell(player) {
        if (player.id === this.network.playerId) {
            this.hud.triggerHitVignette();
            this.renderer.addShake(20);
        }
    }
    onWallRegenerated(wall) {
        // Re-add the wall to mapData
        if (this.mapData) {
            this.mapData.walls.push(wall);
        }
        // Create the wall mesh
        this.renderer.addWall(wall);
    }

    // ========= SLEEP/WAKE ROBUSTNESS =========

    /**
     * Setup handlers for visibility changes, WebGL context loss, etc.
     * Critical for surviving real-world conditions (tab switch, sleep, phone lock)
     */
    setupVisibilityHandlers() {
        // Visibility change (tab switch, minimize)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onGamePause();
            } else {
                this.onGameResume();
            }
        });

        // Window blur/focus (window loses focus)
        window.addEventListener('blur', () => this.onGamePause());
        window.addEventListener('focus', () => this.onGameResume());

        // WebGL context loss (common on Macs with power-saving GPUs)
        this.canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('[Game] WebGL context lost - pausing game');
            this.onGamePause();
        });

        this.canvas.addEventListener('webglcontextrestored', () => {
            console.log('[Game] WebGL context restored - resuming');
            // Renderer should rebuild scene if needed
            if (this.renderer.onContextRestored) {
                this.renderer.onContextRestored();
            }
            this.onGameResume();
        });
    }

    /**
     * Pause the game for sleep/wake handling
     */
    onGamePause() {
        if (this.gamePaused) return; // Already paused
        this.gamePaused = true;
        console.log('[Game] Paused (visibility/blur)');
    }

    /**
     * Resume the game after sleep/wake
     * Resets timers to prevent delta time explosion
     */
    onGameResume() {
        if (!this.gamePaused) return; // Already running

        console.log('[Game] Resuming...');

        // Reset timing to prevent huge delta time
        this.lastTime = performance.now();
        this.lastShootTime = 0;

        // Reset input state to prevent stuck keys
        if (this.input.resetAllKeys) {
            this.input.resetAllKeys();
        }

        // Resume audio context if suspended
        this.resumeAudioContext();

        this.gamePaused = false;
        console.log('[Game] Resumed successfully');
    }

    /**
     * Resume audio context after visibility change
     */
    resumeAudioContext() {
        // Check for any audio context on renderer or globally
        const audioCtx = this.renderer?.audioContext || window.audioContext;
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                console.log('[Game] Audio context resumed');
            }).catch(err => {
                console.warn('[Game] Failed to resume audio:', err);
            });
        }
    }
}

window.addEventListener('load', () => {
    new Game();
});

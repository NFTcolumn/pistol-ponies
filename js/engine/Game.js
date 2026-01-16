// Main Game class for FPS
import { GameConfig } from '/js/config/GameConfig.js';
import { Renderer } from '/js/engine/Renderer.js';
import { Input } from '/js/engine/Input.js';
import { Player } from '/js/entities/Player.js';
import { HUD } from '/js/ui/HUD.js';
import { Menu, Scoreboard } from '/js/ui/Menu.js';
import { NetworkManager } from '/js/network/NetworkManager.js';
import { MobileControls } from '/js/ui/MobileControls.js';
import { WalletManager } from '/js/wallet/WalletManager.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.uiCanvas = document.getElementById('uiCanvas');
        this.renderer = new Renderer(this.canvas);
        this.input = new Input(this.canvas);

        this.hud = new HUD(this.uiCanvas);
        this.menu = new Menu();
        this.scoreboard = new Scoreboard();

        this.network = new NetworkManager(this);

        this.localPlayer = null;
        this.players = new Map(); // Store player objects
        this.playerMeshes = new Map(); // Store Three.js meshes
        this.mapData = null; // Store map for HUD

        this.gameState = 'menu';
        this.lastTime = performance.now();
        this.lastShootTime = 0;

        // Mobile controls
        this.mobileControls = new MobileControls(this);

        // Resize UI canvas
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.setupMenuEvents();
        this.setupScoreboard();

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
        this.wallet = new WalletManager();
        this.setupWalletEvents();
    }

    setupWalletEvents() {
        const connectBtn = document.getElementById('connectWalletBtn');
        const disconnectBtn = document.getElementById('disconnectWalletBtn');
        const chainSelect = document.getElementById('chainSelect');
        const playBtn = document.getElementById('playButton');

        connectBtn.addEventListener('click', async () => {
            try {
                const selectedChain = parseInt(chainSelect.value);

                const result = await this.wallet.connect();

                // Switch to selected chain if different
                if (this.wallet.chainId !== selectedChain) {
                    await this.wallet.switchChain(selectedChain);
                }

                this.updateWalletUI(true);
                await this.checkPonyHolder();
            } catch (error) {
                console.error('Wallet connection error:', error);
                document.getElementById('walletStatus').textContent = error.message;
                document.getElementById('walletStatus').className = 'wallet-status error';
            }
        });

        disconnectBtn.addEventListener('click', () => {
            this.wallet.disconnect();
            this.updateWalletUI(false);
            playBtn.disabled = true;
        });

        chainSelect.addEventListener('change', async () => {
            if (this.wallet.connected) {
                try {
                    await this.wallet.switchChain(parseInt(chainSelect.value));
                    await this.checkPonyHolder();
                } catch (error) {
                    console.error('Chain switch error:', error);
                }
            }
        });
    }

    updateWalletUI(connected) {
        const notConnected = document.getElementById('walletNotConnected');
        const isConnected = document.getElementById('walletConnected');
        const addressDisplay = document.getElementById('walletAddressDisplay');
        const chainDisplay = document.getElementById('walletChainDisplay');

        if (connected) {
            notConnected.style.display = 'none';
            isConnected.style.display = 'block';
            addressDisplay.textContent = this.wallet.getShortAddress();
            chainDisplay.textContent = this.wallet.CHAIN_NAMES[this.wallet.chainId] || 'Unknown';
        } else {
            notConnected.style.display = 'block';
            isConnected.style.display = 'none';
        }
    }

    async checkPonyHolder() {
        const statusEl = document.getElementById('walletStatus');
        const playBtn = document.getElementById('playButton');

        statusEl.textContent = 'Checking PONY balance...';
        statusEl.className = 'wallet-status';

        try {
            const isHolder = await this.wallet.isHolder(1n); // Require at least 1 PONY

            if (isHolder) {
                statusEl.textContent = '✅ PONY holder verified!';
                statusEl.className = 'wallet-status success';
                playBtn.disabled = false;
            } else {
                statusEl.textContent = '❌ You need PONY tokens to play';
                statusEl.className = 'wallet-status error';
                playBtn.disabled = true;
            }
        } catch (error) {
            statusEl.textContent = 'Error checking balance';
            statusEl.className = 'wallet-status error';
            playBtn.disabled = true;
        }
    }

    setupScoreboard() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Tab') {
                e.preventDefault();
                if (this.gameState === 'playing') this.scoreboard.show();
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
            player.kills = data.kills;
            player.deaths = data.deaths;

            // Sync XP and level system
            player.xp = data.xp || 0;
            player.level = data.level || 1;
            player.killStreak = data.killStreak || 0;
            player.skillPoints = data.skillPoints || 0;
            player.stats = data.stats || { speed: 0, health: 0, ammo: 0, jump: 0, dash: 0, aim: 0 };
            player.maxHealth = data.maxHealth || 100;
            player.maxAmmo = data.maxAmmo || 12;

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

        // Build mobile overrides for Player
        let mobileOverrides = null;
        if (this.mobileControls.enabled) {
            // Get movement from joystick
            const joystickMove = this.mobileControls.joystick.active
                ? this.mobileControls.getMovementVector()
                : null;

            // Get touch aim delta
            const aimDelta = this.mobileControls.getAimDelta();

            if (joystickMove || aimDelta) {
                mobileOverrides = {
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
        }

        // Player logic - pass mobile overrides
        this.localPlayer.update(deltaTime, this.input, mobileOverrides);

        this.renderer.updateBullets(deltaTime);

        // Get movement from keyboard or mobile joystick
        let movement = this.input.getMovementVector();
        if (this.mobileControls.enabled && this.mobileControls.joystick.active) {
            const mobileMove = this.mobileControls.getMovementVector();
            movement.x = mobileMove.x;
            movement.z = mobileMove.z;
        }

        const dashKey = this.input.getAndResetDash();

        // Check for mobile jump
        let jumpPressed = this.input.isKeyDown('Space');
        if (this.mobileControls.enabled && this.mobileControls.consumeJump()) {
            jumpPressed = true;
        }

        // We'll normalize what we send to match expected server speeds
        this.network.sendInput({
            x: this.localPlayer.vx / this.localPlayer.speed,
            y: this.localPlayer.vy / this.localPlayer.speed,
            angle: this.localPlayer.angle,
            pitch: this.localPlayer.pitch,
            jump: jumpPressed,
            dash: !!dashKey
        });

        // Shooting (keyboard/mouse or mobile)
        const shouldShoot = this.input.isMouseButtonDown(0) ||
            (this.mobileControls.enabled && this.mobileControls.isShootHeld());
        if (shouldShoot) {
            const now = Date.now();
            if (now - this.lastShootTime > 300) {
                this.network.sendShoot(this.localPlayer.angle);
                this.renderer.addShake(5);
                this.lastShootTime = now;
            }
        }

        // Reload (keyboard or mobile)
        const shouldReload = this.input.isKeyDown('KeyR') || this.input.isKeyDown('KeyQ') ||
            (this.mobileControls.enabled && this.mobileControls.consumeReload());
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
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

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
}

window.addEventListener('load', () => {
    new Game();
});

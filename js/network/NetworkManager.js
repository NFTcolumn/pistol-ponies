// Network Manager - handles client-side networking
import { GameConfig } from '/js/config/GameConfig.js';

export class NetworkManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.latency = 0;
    }

    connect() {
        try {
            this.socket = new WebSocket(GameConfig.SERVER_URL);

            this.socket.onopen = () => {
                console.log('Connected to server');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.sendJoin();
            };

            this.socket.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.socket.onclose = () => {
                console.log('Disconnected from server');
                this.connected = false;
                this.attemptReconnect();
            };

        } catch (error) {
            console.error('Failed to connect:', error);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), 2000);
        } else {
            console.error('Max reconnect attempts reached');
            alert('Lost connection to server. Please refresh the page.');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.connected = false;
        }
    }

    sendJoin() {
        const playerName = this.game.menu.getPlayerName();
        this.send({
            type: 'join',
            name: playerName
        });
    }

    sendInput(input) {
        this.send({
            type: 'input',
            input: input
        });
    }

    sendShoot(angle) {
        this.send({
            type: 'shoot',
            angle: angle
        });
    }

    sendReload() {
        this.send({
            type: 'reload'
        });
    }

    send(data) {
        if (this.socket && this.connected) {
            try {
                this.socket.send(JSON.stringify(data));
            } catch (error) {
                console.error('Failed to send data:', error);
            }
        }
    }

    handleMessage(data) {
        if (data.type === 'hitConfirm') {
            console.log('[NetworkManager] Received hitConfirm:', data);
        }
        switch (data.type) {
            case 'welcome':
                this.playerId = data.playerId;
                this.game.onPlayerJoined(data.playerId, data.map);
                break;

            case 'gameState':
                this.game.onGameState(data.state);
                break;

            case 'playerJoined':
                this.game.onOtherPlayerJoined(data.player);
                break;

            case 'playerLeft':
                this.game.onPlayerLeft(data.playerId);
                break;

            case 'playerKilled':
                this.game.onPlayerKilled(data.killer, data.victim, data.weapon);
                break;

            case 'bulletFired':
                this.game.onBulletFired(data.bullet);
                break;

            case 'wallDestroyed':
                this.game.onWallDestroyed(data.wallId);
                break;

            case 'playerHit':
                this.game.onPlayerHit(data.damage, data.hitZone);
                break;

            case 'hitConfirm':
                console.log('[NetworkManager] Received hitConfirm:', data);
                this.game.onHitConfirm(data);
                break;

            case 'floorTileDestroyed':
                this.game.onFloorTileDestroyed(data.gx, data.gy);
                break;

            case 'playerFell':
                this.game.onPlayerFell(data.player);
                break;

            case 'wallRegenerated':
                this.game.onWallRegenerated(data.wall);
                break;

            case 'ping':
                this.send({ type: 'pong' });
                break;

            case 'pong':
                this.latency = Date.now() - data.timestamp;
                break;

            case 'lootBoxSpawn':
            case 'lootBoxPickup':
                // Handled in other logic or ignored for now
                break;

            default:
                console.warn('Unknown message type:', data.type);
        }
    }
}

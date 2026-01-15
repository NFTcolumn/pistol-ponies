// Menu and UI system
import { GameConfig } from '/js/config/GameConfig.js';

export class Menu {
    constructor() {
        this.currentScreen = 'main'; // main, lobby, settings
        this.playerName = localStorage.getItem('playerName') || 'Player' + Math.floor(Math.random() * 1000);
    }

    show() {
        document.getElementById('menu').style.display = 'flex';
        document.getElementById('gameCanvas').style.display = 'none';
    }

    hide() {
        document.getElementById('menu').style.display = 'none';
        document.getElementById('gameCanvas').style.display = 'block';
    }

    showMainMenu() {
        this.currentScreen = 'main';
        document.getElementById('mainMenu').style.display = 'block';
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('settingsScreen').style.display = 'none';
    }

    showLobby() {
        this.currentScreen = 'lobby';
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'block';
        document.getElementById('settingsScreen').style.display = 'none';
    }

    showSettings() {
        this.currentScreen = 'settings';
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('settingsScreen').style.display = 'block';
    }

    updateLobbyPlayers(players) {
        const list = document.getElementById('playerList');
        list.innerHTML = '';

        players.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-item';
            item.innerHTML = `
        <div class="player-color" style="background-color: ${player.color}"></div>
        <div class="player-name">${player.name}</div>
      `;
            list.appendChild(item);
        });
    }

    getPlayerName() {
        return this.playerName;
    }

    setPlayerName(name) {
        this.playerName = name;
        localStorage.setItem('playerName', name);
    }
}

export class Scoreboard {
    constructor() {
        this.visible = false;
    }

    toggle() {
        this.visible = !this.visible;
    }

    show() {
        this.visible = true;
    }

    hide() {
        this.visible = false;
    }

    draw(ctx, players, canvas) {
        if (!this.visible || !players || players.length === 0) return;

        const width = canvas.width;
        const height = canvas.height;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(width / 2 - 300, height / 2 - 250, 600, 500);

        // Border
        ctx.strokeStyle = GameConfig.COLORS.PRIMARY;
        ctx.lineWidth = 3;
        ctx.strokeRect(width / 2 - 300, height / 2 - 250, 600, 500);

        // Title
        ctx.fillStyle = GameConfig.COLORS.PRIMARY;
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCOREBOARD', width / 2, height / 2 - 210);

        // Headers
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Player', width / 2 - 270, height / 2 - 160);
        ctx.textAlign = 'center';
        ctx.fillText('Kills', width / 2 + 80, height / 2 - 160);
        ctx.fillText('Deaths', width / 2 + 180, height / 2 - 160);

        // Sort players by kills
        const sortedPlayers = [...players].sort((a, b) => b.kills - a.kills);

        // Player list
        for (let i = 0; i < sortedPlayers.length && i < 10; i++) {
            const player = sortedPlayers[i];
            const y = height / 2 - 120 + i * 40;

            // Background
            ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)';
            ctx.fillRect(width / 2 - 280, y - 15, 560, 35);

            // Color indicator
            ctx.fillStyle = player.color;
            ctx.fillRect(width / 2 - 270, y - 10, 20, 25);

            // Name
            ctx.fillStyle = '#fff';
            ctx.font = '16px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(player.name, width / 2 - 240, y + 8);

            // Stats
            ctx.textAlign = 'center';
            ctx.fillText(player.kills.toString(), width / 2 + 80, y + 8);
            ctx.fillText(player.deaths.toString(), width / 2 + 180, y + 8);
        }

        // Footer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press TAB to close', width / 2, height / 2 + 220);
    }
}

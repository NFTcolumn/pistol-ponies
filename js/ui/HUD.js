// HUD (Heads-Up Display)
import { GameConfig } from '/js/config/GameConfig.js';

export class HUD {
    constructor(canvas) {
        this.canvas = canvas;
        this.killFeed = [];
        this.maxKillFeedItems = 5;
        this.killFeedDuration = 5000;
        this.hitVignetteAlpha = 0; // For hit feedback effect
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    addKill(killerName, victimName, weaponType) {
        this.killFeed.unshift({
            killer: killerName,
            victim: victimName,
            weapon: weaponType,
            time: Date.now()
        });

        if (this.killFeed.length > this.maxKillFeedItems) {
            this.killFeed.pop();
        }
    }

    update(deltaTime) {
        // Remove old kill feed items
        const now = Date.now();
        this.killFeed = this.killFeed.filter(item => {
            return now - item.time < this.killFeedDuration;
        });

        // Decay hit vignette
        if (this.hitVignetteAlpha > 0) {
            this.hitVignetteAlpha -= deltaTime * 2; // Fade out over 0.5 seconds
            if (this.hitVignetteAlpha < 0) this.hitVignetteAlpha = 0;
        }
    }

    triggerHitVignette() {
        this.hitVignetteAlpha = 0.5; // Start with 50% opacity
    }

    draw(ctx, player, players, mapData) {
        if (!player) return;

        const width = this.canvas.width;
        const height = this.canvas.height;

        const scale = this.isMobile ? 0.75 : 1.0;

        // Minimap (top left)
        if (mapData) {
            this.drawMinimap(ctx, player, players, mapData, 20, 20, scale);
        }

        // Health bar (below minimap on mobile, bottom left on desktop)
        const healthX = 20;
        const healthY = this.isMobile ? 20 + (180 * scale) + 15 : height - 100;
        this.drawHealthSection(ctx, player, healthX, healthY, scale);

        // Ammo counter (top right on mobile, bottom right on desktop)
        const ammoX = this.isMobile ? width - (200 * scale) - 20 : width - 220;
        const ammoY = this.isMobile ? 20 : height - 100;
        this.drawAmmoSection(ctx, player, ammoX, ammoY, scale);

        // Kill feed (top right below ammo on mobile, desktop stays same)
        const killFeedX = this.isMobile ? width - (300 * scale) - 20 : width - 320;
        const killFeedY = this.isMobile ? ammoY + (80 * scale) + 20 : 20;
        this.drawKillFeed(ctx, killFeedX, killFeedY, scale);

        // Scoreboard hint (top center)
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Hold TAB for Scoreboard', width / 2, 20);
        ctx.restore();

        // Respawn message
        if (!player.alive) {
            this.drawRespawnMessage(ctx, width / 2, height / 2);
        }

        // Speed lines for dash
        if (player.isDashing) {
            this.drawSpeedLines(ctx, width, height);
        }

        // Hit vignette (red screen flash when hit)
        if (this.hitVignetteAlpha > 0) {
            this.drawHitVignette(ctx, width, height);
        }

        // Skill point allocation panel (if player has points)
        if (player.skillPoints > 0) {
            this.drawSkillPanel(ctx, width, height, player);
        }
    }

    drawSkillPanel(ctx, width, height, player) {
        const panelWidth = 300;
        const panelHeight = 250; // Taller for 6 stats
        const panelX = width - panelWidth - 20;
        const panelY = 100;

        ctx.save();

        // Panel background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Title
        ctx.fillStyle = '#ffe66d';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🎯 ${player.skillPoints} SKILL POINTS`, panelX + panelWidth / 2, panelY + 25);

        // Instructions
        ctx.fillStyle = '#aaa';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText('Press 1-6 to allocate', panelX + panelWidth / 2, panelY + 45);

        // Stats list
        const stats = [
            { key: 'speed', name: 'Speed', desc: '+5% move/bullet', icon: '⚡' },
            { key: 'health', name: 'Health', desc: '+10 max HP', icon: '❤️' },
            { key: 'ammo', name: 'Ammo', desc: '+2 max bullets', icon: '🔫' },
            { key: 'jump', name: 'Jump', desc: '+10% height', icon: '🦘' },
            { key: 'dash', name: 'Dash', desc: '+15% distance', icon: '💨' },
            { key: 'aim', name: 'Aim', desc: '-10% spread', icon: '🎯' }
        ];

        let y = panelY + 70;
        stats.forEach((stat, i) => {
            const value = player.stats?.[stat.key] || 0;

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`[${i + 1}] ${stat.icon} ${stat.name}`, panelX + 15, y);

            ctx.fillStyle = '#4ecdc4';
            ctx.textAlign = 'right';
            ctx.fillText(`${value}`, panelX + panelWidth - 60, y);

            ctx.fillStyle = '#888';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText(stat.desc, panelX + panelWidth - 15, y);

            y += 28;
        });

        ctx.restore();
    }

    drawHitVignette(ctx, width, height) {
        ctx.save();

        // Create radial gradient from transparent center to red edges
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) * 0.7
        );
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(0.5, `rgba(255, 0, 0, ${this.hitVignetteAlpha * 0.3})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${this.hitVignetteAlpha})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.restore();
    }

    drawHealthSection(ctx, player, x, y, scale = 1.0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Background
        ctx.fillStyle = GameConfig.COLORS.UI_BG;
        ctx.fillRect(0, 0, 200, 80);

        // Border
        ctx.strokeStyle = GameConfig.COLORS.PRIMARY;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 200, 80);

        // Level badge
        ctx.fillStyle = '#ff6b9d';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`LV ${player.level || 1}`, x + 190, y + 25);

        // Kill streak indicator
        if (player.killStreak >= 2) {
            ctx.fillStyle = '#ffe66d';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(`🔥 x${player.killStreak}`, x + 190, y + 75);
        }

        // Health label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('HEALTH', x + 10, y + 25);

        // Health bar
        const barWidth = 180;
        const barHeight = 30;
        const barX = x + 10;
        const barY = y + 35;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health fill
        const healthPercent = player.health / player.maxHealth;
        const fillWidth = barWidth * healthPercent;

        const gradient = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
        if (healthPercent > 0.5) {
            gradient.addColorStop(0, GameConfig.COLORS.SUCCESS);
            gradient.addColorStop(1, '#66ff66');
        } else if (healthPercent > 0.25) {
            gradient.addColorStop(0, GameConfig.COLORS.ACCENT);
            gradient.addColorStop(1, '#ffff66');
        } else {
            gradient.addColorStop(0, GameConfig.COLORS.DANGER);
            gradient.addColorStop(1, '#ff9999');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, fillWidth, barHeight);

        // Health text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(player.health), barX + barWidth / 2, barY + barHeight / 2 + 6);
        ctx.restore();
    }

    drawAmmoSection(ctx, player, x, y, scale = 1.0) {
        const weapon = player.weapon;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Background
        ctx.fillStyle = GameConfig.COLORS.UI_BG;
        ctx.fillRect(0, 0, 200, 80);

        // Border
        ctx.strokeStyle = GameConfig.COLORS.ACCENT;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 200, 80);

        // Weapon name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(weapon.config.name.toUpperCase(), x + 10, y + 25);

        // Ammo display
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.textAlign = 'right';

        if (weapon.reloading) {
            ctx.fillStyle = GameConfig.COLORS.ACCENT;
            ctx.fillText('RELOADING...', x + 190, y + 60);
        } else {
            ctx.fillStyle = weapon.ammo > 0 ? '#fff' : GameConfig.COLORS.DANGER;
            ctx.fillText(`${weapon.ammo}/${weapon.config.magazineSize}`, x + 190, y + 60);
        }

        // Reload bar
        if (weapon.reloading) {
            const progress = weapon.getReloadProgress(Date.now());
            const barWidth = 180;
            const barHeight = 5;
            const barX = x + 10;
            const barY = y + 70;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = GameConfig.COLORS.ACCENT;
            ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        }
        ctx.restore();
    }

    drawCrosshair(ctx, x, y) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;

        const size = 10;
        const gap = 5;

        // Top
        ctx.beginPath();
        ctx.moveTo(x, y - gap);
        ctx.lineTo(x, y - gap - size);
        ctx.stroke();

        // Bottom
        ctx.beginPath();
        ctx.moveTo(x, y + gap);
        ctx.lineTo(x, y + gap + size);
        ctx.stroke();

        // Left
        ctx.beginPath();
        ctx.moveTo(x - gap, y);
        ctx.lineTo(x - gap - size, y);
        ctx.stroke();

        // Right
        ctx.beginPath();
        ctx.moveTo(x + gap, y);
        ctx.lineTo(x + gap + size, y);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    drawMinimap(ctx, localPlayer, players, mapData, x, y, scaleHUD = 1.0) {
        const size = 180 * scaleHUD;
        const scale = size / Math.max(mapData.width, mapData.height);

        ctx.save();
        ctx.translate(x, y);

        // Background
        ctx.fillStyle = GameConfig.COLORS.UI_BG;
        ctx.fillRect(0, 0, size, size);

        // Border
        ctx.strokeStyle = GameConfig.COLORS.SECONDARY;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, size, size);

        // Walls
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (const wall of mapData.walls) {
            ctx.fillRect(wall.x * scale, wall.y * scale, wall.width * scale, wall.height * scale);
        }

        // Other players
        for (const [id, player] of players) {
            if (id === localPlayer.id || !player.alive) continue;
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.x * scale, player.y * scale, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Local player
        ctx.fillStyle = localPlayer.color;
        ctx.beginPath();
        ctx.arc(localPlayer.x * scale, localPlayer.y * scale, 4, 0, Math.PI * 2);
        ctx.fill();

        // Local player direction
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(localPlayer.x * scale, localPlayer.y * scale);
        ctx.lineTo(
            (localPlayer.x + Math.sin(localPlayer.angle) * 100) * scale,
            (localPlayer.y - Math.cos(localPlayer.angle) * 100) * scale
        );
        ctx.stroke();

        ctx.restore();
    }

    drawKillFeed(ctx, x, y, scale = 1.0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        for (let i = 0; i < this.killFeed.length; i++) {
            const item = this.killFeed[i];
            const itemY = i * 35;
            const age = Date.now() - item.time;
            const alpha = age > 4000 ? 1 - (age - 4000) / 1000 : 1;

            ctx.globalAlpha = alpha;

            // Background
            ctx.fillStyle = GameConfig.COLORS.UI_BG;
            ctx.fillRect(0, itemY, 300, 30);

            // Border
            ctx.strokeStyle = GameConfig.COLORS.DANGER;
            ctx.lineWidth = 1;
            ctx.strokeRect(0, itemY, 300, 30);

            // Text
            ctx.fillStyle = '#fff';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${item.killer} ☠ ${item.victim}`, 10, itemY + 20);
        }

        ctx.restore();
    }

    drawSpeedLines(ctx, width, height) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;

        const centerX = width / 2;
        const centerY = height / 2;
        const numLines = 40;

        for (let i = 0; i < numLines; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 400;
            const length = 50 + Math.random() * 100;

            ctx.beginPath();
            ctx.moveTo(
                centerX + Math.cos(angle) * dist,
                centerY + Math.sin(angle) * dist
            );
            ctx.lineTo(
                centerX + Math.cos(angle) * (dist + length),
                centerY + Math.sin(angle) * (dist + length)
            );
            ctx.stroke();
        }

        ctx.restore();
    }

    drawRespawnMessage(ctx, x, y) {
        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 200, y - 50, 400, 100);

        // Border
        ctx.strokeStyle = GameConfig.COLORS.DANGER;
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 200, y - 50, 400, 100);

        // Text
        ctx.fillStyle = GameConfig.COLORS.DANGER;
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', x, y - 10);

        ctx.fillStyle = '#fff';
        ctx.font = '18px Inter, sans-serif';
        ctx.fillText('Respawning soon...', x, y + 20);

        ctx.restore();
    }
}

// Bullet class
import { GameConfig } from '/js/config/GameConfig.js';

export class Bullet {
    constructor(x, y, angle, speed, damage, ownerId, color = '#FFD700') {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.ownerId = ownerId;
        this.color = color;

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.radius = GameConfig.BULLET_SIZE;
        this.createdTime = Date.now();
        this.lifetime = GameConfig.BULLET_LIFETIME;

        this.active = true;
    }

    update(deltaTime) {
        if (!this.active) return;

        // Move bullet
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Check lifetime
        if (Date.now() - this.createdTime > this.lifetime) {
            this.active = false;
        }
    }

    draw(renderer) {
        if (!this.active) return;

        // Draw bullet trail
        const trailLength = 15;
        const endX = this.x - Math.cos(this.angle) * trailLength;
        const endY = this.y - Math.sin(this.angle) * trailLength;

        renderer.ctx.save();
        renderer.ctx.globalAlpha = 0.5;
        renderer.drawLine(this.x, this.y, endX, endY, this.color, 2);
        renderer.ctx.restore();

        // Draw bullet
        renderer.drawCircle(this.x, this.y, this.radius, this.color);

        // Glow effect
        renderer.ctx.save();
        renderer.ctx.globalAlpha = 0.3;
        renderer.drawCircle(this.x, this.y, this.radius * 2, this.color);
        renderer.ctx.restore();
    }

    checkMapCollision(physics) {
        const hit = physics.raycastToMap(
            this.x - this.vx * 0.016,
            this.y - this.vy * 0.016,
            this.x,
            this.y
        );

        if (hit) {
            this.active = false;
            return true;
        }

        return false;
    }

    checkPlayerCollision(player) {
        if (this.ownerId === player.id) return false;
        if (!player.alive) return false;

        const distance = Math.sqrt(
            Math.pow(this.x - player.x, 2) +
            Math.pow(this.y - player.y, 2)
        );

        if (distance < this.radius + player.radius) {
            this.active = false;
            return true;
        }

        return false;
    }
}

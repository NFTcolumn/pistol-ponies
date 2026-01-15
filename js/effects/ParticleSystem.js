// Particle System
import { MathUtils } from '/js/utils/MathUtils.js';

export class Particle {
    constructor(x, y, vx, vy, color, size, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.age = 0;
        this.active = true;
    }

    update(deltaTime) {
        this.age += deltaTime * 1000;
        if (this.age >= this.lifetime) {
            this.active = false;
            return;
        }

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.vy += 200 * deltaTime; // Gravity
        this.vx *= 0.98; // Friction
    }

    draw(renderer) {
        if (!this.active) return;

        const alpha = 1 - (this.age / this.lifetime);
        renderer.ctx.save();
        renderer.ctx.globalAlpha = alpha;
        renderer.drawCircle(this.x, this.y, this.size, this.color);
        renderer.ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, config = {}) {
        const {
            color = '#fff',
            minSpeed = 50,
            maxSpeed = 150,
            minSize = 2,
            maxSize = 5,
            minLifetime = 200,
            maxLifetime = 600,
            spread = Math.PI * 2
        } = config;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * spread - spread / 2;
            const speed = MathUtils.randomRange(minSpeed, maxSpeed);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = MathUtils.randomRange(minSize, maxSize);
            const lifetime = MathUtils.randomRange(minLifetime, maxLifetime);

            this.particles.push(new Particle(x, y, vx, vy, color, size, lifetime));
        }
    }

    createMuzzleFlash(x, y, angle) {
        this.emit(x, y, 8, {
            color: '#FFD700',
            minSpeed: 100,
            maxSpeed: 200,
            minSize: 3,
            maxSize: 6,
            minLifetime: 100,
            maxLifetime: 300,
            spread: Math.PI / 6
        });
    }

    createBulletImpact(x, y, color = '#888') {
        this.emit(x, y, 12, {
            color: color,
            minSpeed: 50,
            maxSpeed: 150,
            minSize: 2,
            maxSize: 4,
            minLifetime: 200,
            maxLifetime: 500,
            spread: Math.PI * 2
        });
    }

    createBloodSplatter(x, y) {
        this.emit(x, y, 15, {
            color: '#ff0000',
            minSpeed: 100,
            maxSpeed: 250,
            minSize: 3,
            maxSize: 7,
            minLifetime: 300,
            maxLifetime: 800,
            spread: Math.PI * 2
        });
    }

    createDeathEffect(x, y, color) {
        this.emit(x, y, 30, {
            color: color,
            minSpeed: 50,
            maxSpeed: 300,
            minSize: 4,
            maxSize: 10,
            minLifetime: 400,
            maxLifetime: 1000,
            spread: Math.PI * 2
        });
    }

    update(deltaTime) {
        for (const particle of this.particles) {
            particle.update(deltaTime);
        }

        // Remove inactive particles
        this.particles = this.particles.filter(p => p.active);
    }

    draw(renderer) {
        for (const particle of this.particles) {
            particle.draw(renderer);
        }
    }

    clear() {
        this.particles = [];
    }
}

// Weapon class
import { GameConfig } from '/js/config/GameConfig.js';
import { Bullet } from '/js/entities/Bullet.js';

export class Weapon {
    constructor(type) {
        this.type = type;
        this.config = GameConfig.WEAPONS[type];

        this.ammo = this.config.magazineSize;
        this.lastFireTime = 0;
        this.reloading = false;
        this.reloadStartTime = 0;
    }

    canFire(currentTime) {
        if (this.reloading) return false;
        if (this.ammo <= 0) return false;
        if (currentTime - this.lastFireTime < this.config.fireRate) return false;
        return true;
    }

    fire(x, y, angle, currentTime, ownerId) {
        if (!this.canFire(currentTime)) return null;

        this.ammo--;
        this.lastFireTime = currentTime;

        // Apply spread
        const spread = (Math.random() - 0.5) * this.config.spread;
        const finalAngle = angle + spread;

        // Create bullet
        const bullet = new Bullet(
            x,
            y,
            finalAngle,
            this.config.bulletSpeed,
            this.config.damage,
            ownerId,
            this.config.color
        );

        // Auto reload if empty
        if (this.ammo === 0) {
            this.startReload(currentTime);
        }

        return bullet;
    }

    startReload(currentTime) {
        if (this.reloading) return false;
        if (this.ammo === this.config.magazineSize) return false;

        this.reloading = true;
        this.reloadStartTime = currentTime;
        return true;
    }

    update(currentTime) {
        if (this.reloading) {
            if (currentTime - this.reloadStartTime >= this.config.reloadTime) {
                this.ammo = this.config.magazineSize;
                this.reloading = false;
            }
        }
    }

    getReloadProgress(currentTime) {
        if (!this.reloading) return 1;
        const elapsed = currentTime - this.reloadStartTime;
        return Math.min(elapsed / this.config.reloadTime, 1);
    }
}

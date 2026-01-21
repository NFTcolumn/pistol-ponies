// Player class for FPS
import { GameConfig } from '/js/config/GameConfig.js';
import { Weapon } from '/js/entities/Weapon.js';

export class Player {
    constructor(id, name, x, y, color) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.color = color;

        this.vx = 0;
        this.vy = 0;
        this.angle = 0; // Yaw rotation in radians
        this.pitch = 0; // Pitch rotation in radians

        this.radius = GameConfig.PLAYER_SIZE / 2;
        this.speed = GameConfig.PLAYER_SPEED;

        this.health = GameConfig.PLAYER_MAX_HEALTH;
        this.maxHealth = GameConfig.PLAYER_MAX_HEALTH;
        this.alive = true;

        this.weapon = new Weapon('PISTOL');
        this.kills = 0;
        this.deaths = 0;

        this.spawnProtectionUntil = Date.now() + GameConfig.SPAWN_PROTECTION_TIME;
        this.lastDamageTime = 0;

        // 3D Specific
        this.mesh = null; // Will be assigned by Game/Renderer
    }

    update(deltaTime, input, mobileOverrides = null) {
        if (!this.alive) return;

        this.weapon.update(Date.now());

        // Update rotation based on mouse movement or mobile gyro
        const mouseSensitivity = 0.002;

        if (mobileOverrides && mobileOverrides.aimDelta) {
            // Mobile stick aim
            this.angle += mobileOverrides.aimDelta.x * deltaTime;
            this.pitch -= mobileOverrides.aimDelta.y * deltaTime;
        } else {
            // Desktop mouse aim
            this.angle += input.mouse.movementX * mouseSensitivity;
            this.pitch -= input.mouse.movementY * mouseSensitivity;
        }

        // Clamp pitch
        const maxPitch = Math.PI / 2 - 0.1;
        this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

        // Get movement input (relative to player angle)
        let moveInput;
        if (mobileOverrides && mobileOverrides.movement) {
            // Mobile joystick
            moveInput = mobileOverrides.movement;
        } else {
            // Desktop keyboard
            moveInput = input.getMovementVector();
        }

        // Calculate world-space velocity based on local input and player angle
        // Forward is -Z in Three.js, but on our 2D server Y is depth.
        // Let's use standard rotation matrix:
        // worldX = localX * cos(angle) - localZ * sin(angle)
        // worldY = localX * sin(angle) + localZ * cos(angle)

        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        const worldVX = (moveInput.x * cos - moveInput.z * sin) * this.speed;
        const worldVY = (moveInput.x * sin + moveInput.z * cos) * this.speed;

        this.vx = worldVX;
        this.vy = worldVY;
    }

    shoot(currentTime) {
        if (!this.alive) return null;

        const spawnDist = this.radius + 10;
        // Adjust bullet spawn to player heading
        const bulletX = this.x + Math.sin(this.angle) * spawnDist;
        const bulletY = this.y - Math.cos(this.angle) * spawnDist;

        return this.weapon.fire(bulletX, bulletY, this.angle, currentTime, this.id);
    }

    // ... rest of the methods can stay similar but we'll prune for now and focus on movement
    reload(currentTime) {
        if (!this.alive) return false;
        return this.weapon.startReload(currentTime);
    }

    respawn(x, y) {
        this.x = x;
        this.y = y;
        this.health = this.maxHealth;
        this.alive = true;
        this.spawnProtectionUntil = Date.now() + GameConfig.SPAWN_PROTECTION_TIME;
        this.weapon = new Weapon('PISTOL');
    }
}

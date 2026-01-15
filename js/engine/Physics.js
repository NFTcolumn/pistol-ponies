// Physics Engine - handles collisions and raycasting
import { MathUtils } from '/js/utils/MathUtils.js';

export class Physics {
    constructor(map) {
        this.map = map;
    }

    checkCollisionWithMap(x, y, radius) {
        if (!this.map) return false;

        // Check collision with walls
        for (const wall of this.map.walls) {
            if (MathUtils.circleRectCollide(x, y, radius, wall.x, wall.y, wall.width, wall.height)) {
                return true;
            }
        }

        return false;
    }

    moveWithCollision(entity, dx, dy) {
        const newX = entity.x + dx;
        const newY = entity.y + dy;

        // Check X axis
        if (!this.checkCollisionWithMap(newX, entity.y, entity.radius)) {
            entity.x = newX;
        }

        // Check Y axis
        if (!this.checkCollisionWithMap(entity.x, newY, entity.radius)) {
            entity.y = newY;
        }
    }

    raycastToMap(x1, y1, x2, y2) {
        if (!this.map) return null;

        let closestHit = null;
        let closestDist = Infinity;

        for (const wall of this.map.walls) {
            if (MathUtils.lineIntersectsRect(x1, y1, x2, y2, wall.x, wall.y, wall.width, wall.height)) {
                const dist = MathUtils.distance(x1, y1, wall.x + wall.width / 2, wall.y + wall.height / 2);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestHit = wall;
                }
            }
        }

        return closestHit;
    }

    checkLineOfSight(x1, y1, x2, y2) {
        return !this.raycastToMap(x1, y1, x2, y2);
    }

    checkCircleCollision(x1, y1, r1, x2, y2, r2) {
        return MathUtils.circlesCollide(x1, y1, r1, x2, y2, r2);
    }

    findNearestSpawnPoint(players) {
        if (!this.map || !this.map.spawnPoints.length) {
            return { x: 400, y: 300 };
        }

        // Find spawn point furthest from all players
        let bestSpawn = this.map.spawnPoints[0];
        let bestScore = -Infinity;

        for (const spawn of this.map.spawnPoints) {
            let minDist = Infinity;

            for (const player of players) {
                const dist = MathUtils.distance(spawn.x, spawn.y, player.x, player.y);
                minDist = Math.min(minDist, dist);
            }

            if (minDist > bestScore) {
                bestScore = minDist;
                bestSpawn = spawn;
            }
        }

        return { ...bestSpawn };
    }
}

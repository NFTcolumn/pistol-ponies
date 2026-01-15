// Map class
import { GameConfig } from '/js/config/GameConfig.js';

export class Map {
    constructor(mapData) {
        this.width = mapData.width;
        this.height = mapData.height;
        this.walls = mapData.walls || [];
        this.spawnPoints = mapData.spawnPoints || [];
        this.decorations = mapData.decorations || [];
    }

    draw(renderer) {
        // Draw floor grid
        renderer.ctx.save();
        renderer.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        renderer.ctx.lineWidth = 1;

        const gridSize = GameConfig.TILE_SIZE;

        for (let x = 0; x < this.width; x += gridSize) {
            renderer.ctx.beginPath();
            renderer.ctx.moveTo(x, 0);
            renderer.ctx.lineTo(x, this.height);
            renderer.ctx.stroke();
        }

        for (let y = 0; y < this.height; y += gridSize) {
            renderer.ctx.beginPath();
            renderer.ctx.moveTo(0, y);
            renderer.ctx.lineTo(this.width, y);
            renderer.ctx.stroke();
        }

        renderer.ctx.restore();

        // Draw decorations
        for (const deco of this.decorations) {
            renderer.ctx.fillStyle = deco.color;
            renderer.ctx.fillRect(deco.x, deco.y, deco.width, deco.height);
        }

        // Draw walls
        for (const wall of this.walls) {
            // Shadow
            renderer.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            renderer.ctx.fillRect(wall.x + 5, wall.y + 5, wall.width, wall.height);

            // Wall
            renderer.ctx.fillStyle = GameConfig.WALL_COLOR;
            renderer.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

            // Highlight
            renderer.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            renderer.ctx.fillRect(wall.x, wall.y, wall.width, 3);

            // Border
            renderer.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            renderer.ctx.lineWidth = 2;
            renderer.ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
        }

        // Draw spawn points (for debugging)
        if (false) { // Set to true for debugging
            for (const spawn of this.spawnPoints) {
                renderer.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                renderer.ctx.beginPath();
                renderer.ctx.arc(spawn.x, spawn.y, 20, 0, Math.PI * 2);
                renderer.ctx.fill();
            }
        }
    }
}

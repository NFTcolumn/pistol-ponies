// Map data and loader
import { Map } from '/js/map/Map.js';

export const MapData = {
    ARENA: {
        name: 'Arena',
        width: 1920,
        height: 1080,
        walls: [
            // Outer boundaries
            { x: 0, y: 0, width: 2000, height: 40 },
            { x: 0, y: 1960, width: 2000, height: 40 },
            { x: 0, y: 0, width: 40, height: 2000 },
            { x: 1960, y: 0, width: 40, height: 2000 },

            // Internal maze walls (based on a 5x5 grid, 400x400 cells)
            // Row 1
            { x: 400, y: 40, width: 40, height: 360 },
            { x: 800, y: 40, width: 40, height: 360 },
            { x: 1200, y: 40, width: 40, height: 360 },
            { x: 1600, y: 40, width: 40, height: 360 },
            { x: 40, y: 200, width: 200, height: 40 },
            { x: 900, y: 200, width: 120, height: 40 },

            // Row 2
            { x: 40, y: 400, width: 360, height: 40 },
            { x: 800, y: 440, width: 40, height: 360 },
            { x: 1240, y: 400, width: 360, height: 40 },
            { x: 400, y: 440, width: 40, height: 160 },
            { x: 1600, y: 440, width: 40, height: 360 },

            // Row 3
            { x: 400, y: 800, width: 1200, height: 40 },
            { x: 400, y: 840, width: 40, height: 360 },
            { x: 800, y: 840, width: 40, height: 160 },
            { x: 1200, y: 840, width: 40, height: 160 },

            // Row 4
            { x: 800, y: 1200, width: 40, height: 360 },
            { x: 1200, y: 1200, width: 40, height: 360 },
            { x: 40, y: 1600, width: 760, height: 40 },
            { x: 1200, y: 1600, width: 760, height: 40 },
            { x: 400, y: 1360, width: 40, height: 240 },
            { x: 1600, y: 1200, width: 40, height: 240 },

            // Central obstacles for more tactical play
            { x: 960, y: 960, width: 80, height: 80 },
            { x: 800, y: 800, width: 80, height: 80 },
            { x: 1120, y: 1120, width: 80, height: 80 },
            { x: 1120, y: 800, width: 80, height: 80 },
            { x: 800, y: 1120, width: 80, height: 80 }
        ],
        spawnPoints: [
            { x: 150, y: 150 },
            { x: 1770, y: 150 },
            { x: 150, y: 930 },
            { x: 1770, y: 930 },
            { x: 960, y: 150 },
            { x: 960, y: 930 },
            { x: 150, y: 540 },
            { x: 1770, y: 540 }
        ],
        decorations: [
            // Floor patterns
            { x: 500, y: 500, width: 30, height: 30, color: 'rgba(255, 255, 255, 0.03)' },
            { x: 1400, y: 300, width: 30, height: 30, color: 'rgba(255, 255, 255, 0.03)' },
            { x: 700, y: 750, width: 30, height: 30, color: 'rgba(255, 255, 255, 0.03)' }
        ]
    }
};

export class MapLoader {
    static loadMap(mapName) {
        const mapData = MapData[mapName];
        if (!mapData) {
            console.error(`Map ${mapName} not found!`);
            return null;
        }

        return new Map(mapData);
    }

    static getAvailableMaps() {
        return Object.keys(MapData);
    }
}

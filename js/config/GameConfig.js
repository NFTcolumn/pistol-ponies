// Game Configuration
export const GameConfig = {
  // Display
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  TARGET_FPS: 60,

  // Player
  PLAYER_SIZE: 30,
  PLAYER_SPEED: 200, // pixels per second
  PLAYER_MAX_HEALTH: 100,
  PLAYER_RESPAWN_TIME: 3000, // ms

  // Weapons
  WEAPONS: {
    PISTOL: {
      name: 'Pistol',
      damage: 25,
      fireRate: 300, // ms between shots
      magazineSize: 12,
      reloadTime: 1500,
      bulletSpeed: 600,
      spread: 0.05,
      color: '#FFD700'
    },
    REVOLVER: {
      name: 'Revolver',
      damage: 50,
      fireRate: 600,
      magazineSize: 6,
      reloadTime: 2000,
      bulletSpeed: 800,
      spread: 0.02,
      color: '#FF4500'
    },
    MAGNUM: {
      name: 'Magnum',
      damage: 75,
      fireRate: 800,
      magazineSize: 5,
      reloadTime: 2500,
      bulletSpeed: 1000,
      spread: 0.01,
      color: '#DC143C'
    },
    DERRINGER: {
      name: 'Derringer',
      damage: 40,
      fireRate: 150,
      magazineSize: 2,
      reloadTime: 1000,
      bulletSpeed: 500,
      spread: 0.1,
      color: '#9370DB'
    }
  },

  // Bullets
  BULLET_SIZE: 0.4, // 90% smaller
  BULLET_LIFETIME: 2000, // ms

  // Player Hitbox Zones (heights in units, player starts at height 0)
  HITBOX: {
    LEG_MIN: 0,
    LEG_MAX: 12,
    BODY_MIN: 12,
    BODY_MAX: 30,
    HEAD_MIN: 30,
    HEAD_MAX: 50
  },

  // Damage Multipliers
  HEAD_DAMAGE_MULTIPLIER: 4, // 25 * 4 = 100 = instant kill
  LEG_SLOW_DURATION: 2000, // ms
  LEG_SLOW_FACTOR: 0.5, // 50% speed reduction

  // Health Regeneration
  HEALTH_REGEN_DELAY: 5000, // ms after last damage
  HEALTH_REGEN_RATE: 5, // HP per second

  // Map
  TILE_SIZE: 64,
  WALL_COLOR: '#455d7a',
  FLOOR_COLOR: '#506a85',
  SPAWN_PROTECTION_TIME: 2000, // ms

  // Network
  // Production: Set VITE_SERVER_URL env var on Netlify to your Railway WebSocket URL
  // Example: wss://pistol-ponies-production.up.railway.app
  SERVER_URL: import.meta.env.VITE_SERVER_URL || 'ws://localhost:3000',
  SERVER_TICK_RATE: 60, // ticks per second
  INTERPOLATION_DELAY: 100, // ms

  // UI Colors
  COLORS: {
    PRIMARY: '#ff6b9d',
    SECONDARY: '#4ecdc4',
    ACCENT: '#ffe66d',
    DANGER: '#ff6b6b',
    SUCCESS: '#51cf66',
    BACKGROUND: '#2a2a4e',
    UI_BG: 'rgba(32, 43, 72, 0.9)',
    TEXT: '#eee'
  },

  // Teams (for future team mode)
  TEAMS: {
    RED: { color: '#ff6b6b', name: 'Red Team' },
    BLUE: { color: '#4dabf7', name: 'Blue Team' }
  }
};

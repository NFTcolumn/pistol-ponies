# Pistol Ponies 🐴🔫

A fast-paced 2D online multiplayer FPS shooter where ponies battle it out with pistols!

## Features

- **Real-time Multiplayer**: WebSocket-based multiplayer supporting 4-8 players
- **Smooth Gameplay**: 60 FPS gameplay with responsive controls
- **Multiple Weapons**: 4 different pistol types with unique stats
- **Premium UI**: Modern design with glassmorphic elements and animations
- **Particle Effects**: Muzzle flash, bullet impacts, and death effects
- **Kill Feed**: Real-time kill notifications
- **Scoreboard**: Track kills and deaths

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Game

### Option 1: Run Separately

**Start the server:**
```bash
npm run server
```

**In a new terminal, start the client:**
```bash
npm run client
```

### Option 2: Run Both Together

```bash
npm run dev
```

## How to Play

1. Open your browser to `http://localhost:8080`
2. Enter your player name
3. Click "PLAY NOW"
4. Wait for other players to join (or open multiple browser windows to test)

### Controls

- **WASD** or **Arrow Keys**: Move
- **Mouse**: Aim
- **Left Click**: Shoot
- **R**: Reload
- **TAB**: Show scoreboard (hold)

## Weapons

### Pistol
- Damage: 25
- Magazine: 12 rounds
- Fire Rate: Fast
- Best for: Beginners

### Revolver
- Damage: 50
- Magazine: 6 rounds
- Fire Rate: Medium
- Best for: Precision shots

### Magnum
- Damage: 75
- Magazine: 5 rounds
- Fire Rate: Slow
- Best for: High damage

### Derringer
- Damage: 40
- Magazine: 2 rounds
- Fire Rate: Very Fast
- Best for: Close combat

## Architecture

### Client (`/js`)
- **Engine**: Game loop, rendering, physics, input handling
- **Entities**: Player, weapons, bullets
- **Effects**: Particles, sounds
- **UI**: HUD, menu, scoreboard
- **Network**: WebSocket client

### Server (`/server`)
- **WebSocket Server**: Handles player connections
- **Game Loop**: 60 tick server-side simulation
- **Hit Detection**: Server-authoritative combat

## Customization

### Changing Server URL

Edit `js/config/GameConfig.js`:
```javascript
SERVER_URL: 'ws://your-server:3000'
```

### Adding New Maps

Add map data to `js/map/MapLoader.js`:
```javascript
export const MapData = {
  YOUR_MAP: {
    name: 'Your Map',
    width: 1920,
    height: 1080,
    walls: [...],
    spawnPoints: [...]
  }
};
```

### Tweaking Gameplay

Modify values in `js/config/GameConfig.js`:
- Player speed
- Weapon stats
- Spawn protection time
- And more!

## Deployment

To deploy this game online, you'll need:

1. **Server Hosting**: Deploy `server/server.js` to a Node.js hosting service like:
   - Heroku
   - DigitalOcean
   - Railway
   - Render

2. **Client Hosting**: Host the static files (`index.html`, `styles.css`, `/js`) on:
   - Vercel
   - Netlify
   - GitHub Pages
   - Any static hosting service

3. **Update Server URL**: Change `SERVER_URL` in `GameConfig.js` to your deployed server URL

## Troubleshooting

**Can't connect to server:**
- Make sure the server is running on port 3000
- Check that WebSocket port is not blocked by firewall
- Verify `SERVER_URL` in config matches your server address

**Game is laggy:**
- Check network connection
- Try reducing number of particles
- Close other applications

**Players not syncing:**
- Refresh the page
- Check server console for errors
- Verify all clients are connected to the same server

## Credits

Created with ❤️ using vanilla JavaScript and HTML5 Canvas

Enjoy the game! 🎮

# Pistol Ponies - Changelog

## [2026-01-24] - Audio & Mobile Overhaul

### [SOUND]
- **Theme Music**: Integrated "Pistol Ponies Theme" which plays upon clicking "Play Now".
- **Background Music**: Added a looping background track (Background_Loop.mp3) that starts after the theme ends. Volume set to 25%.
- **Jump/Airborne Fix**: 
    - Resolved "infinitely looping airborne sound" bug.
    - Implemented a "woosh" jump sound (one-shot) and a separate "wind" airborne loop.
    - Fixed duplicate jump sound trigger by moving logic to state transitions.
- **Landing SFX**: Fixed landing sound trigger to ensure it plays on both floor and wall landings.
- **Initialization Fix**: Fixed bug where airborne sound played at the start of the game by properly initializing the `grounded` state.

### [IMPROVEMENT]
- **Wall Landing**: Enabled players to land on top of walls (height 100).
- **Physics Sync**: Improved server-client synchronization for the `grounded` state to ensure accurate sound triggers.
- **Physics Balance**: Increased base jump force to accommodate wall-height platforming.

### [FEATURE]
- **Mobile Controller**: 
    - Redesigned and repositioned the mobile controller to the bottom of the screen.
    - Replaced text buttons with emojis (`🔄` for Reload, `⏫` for Jump).
    - Improved button responsiveness and styling.

### [BUGFIX]
- **Floor Damage**: Disabled the destructible floor logic ("black marks") and removed the ability for players to fall through the map.
- **Bullet Logic**: Adjusted bullet collision to prevent damaging the floor tiles.

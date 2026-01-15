// Input Manager - handles keyboard and mouse input with FPS support
export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            movementX: 0,
            movementY: 0,
            buttons: {}
        };
        this.isPointerLocked = false;
        this.isGameActive = false; // Track if game is in playing state

        this.setupEventListeners();
    }

    setGameActive(active) {
        this.isGameActive = active;
    }

    setupEventListeners() {
        this.lastTapTimes = {};
        this.dashTriggered = null; // Store which key triggered the dash

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (this.keys[e.code]) return; // Ignore repeats

            const now = performance.now();
            const dashKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

            if (dashKeys.includes(e.code)) {
                if (now - (this.lastTapTimes[e.code] || 0) < 200) {
                    this.dashTriggered = e.code;
                }
                this.lastTapTimes[e.code] = now;
            }

            this.keys[e.code] = true;
            // Only prevent default for game keys when game is active (not in menu)
            const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyR', 'KeyQ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (this.isGameActive && gameKeys.includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Pointer lock change
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
        });

        // Mouse movement
        window.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.mouse.movementX = e.movementX || 0;
                this.mouse.movementY = e.movementY || 0;

                // Track relative pitch here for better responsiveness if needed
                // but we'll stick to movementY and let Player.js handle it
            } else {
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.x = e.clientX - rect.left;
                this.mouse.y = e.clientY - rect.top;
            }
        });

        // Mouse buttons
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.isPointerLocked) {
                this.canvas.requestPointerLock();
            }
            this.mouse.buttons[e.button] = true;
            e.preventDefault();
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.mouse.buttons[e.button] = false;
        });

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Lose focus
        window.addEventListener('blur', () => {
            this.keys = {};
            this.mouse.buttons = {};
        });
    }

    clearMovementDelta() {
        this.mouse.movementX = 0;
        this.mouse.movementY = 0;
    }

    getAndResetDash() {
        const dash = this.dashTriggered;
        this.dashTriggered = null;
        return dash;
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    isMouseButtonDown(button = 0) {
        return !!this.mouse.buttons[button];
    }

    getMovementVector() {
        let x = 0;
        let z = 0;

        // WASD keys
        if (this.isKeyDown('KeyW')) z -= 1;
        if (this.isKeyDown('KeyS')) z += 1;
        if (this.isKeyDown('KeyA')) x -= 1;
        if (this.isKeyDown('KeyD')) x += 1;

        // Arrow keys (same mapping)
        if (this.isKeyDown('ArrowUp')) z -= 1;
        if (this.isKeyDown('ArrowDown')) z += 1;
        if (this.isKeyDown('ArrowLeft')) x -= 1;
        if (this.isKeyDown('ArrowRight')) x += 1;

        // Normalize if moving diagonally
        if (x !== 0 && z !== 0) {
            const length = Math.sqrt(x * x + z * z);
            x /= length;
            z /= length;
        }

        // Clamp to -1, 1 range (in case both WASD and arrow are pressed)
        x = Math.max(-1, Math.min(1, x));
        z = Math.max(-1, Math.min(1, z));

        return { x, z };
    }
}

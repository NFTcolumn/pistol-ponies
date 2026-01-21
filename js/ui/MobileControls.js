// Mobile Controls - Touch input for mobile players
export class MobileControls {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.container = null;

        // Control states
        this.moveJoystick = { x: 0, z: 0, active: false, touchId: null };
        this.aimJoystick = { x: 0, y: 0, active: false, touchId: null };
        this.shootHeld = false;
        this.jumpPressed = false;
        this.reloadPressed = false;
        this.statPressed = null;

        // Double tap / Auto fire tracking
        this.lastTapTime = 0;
        this.doubleTapThreshold = 300; // ms
        this.isAutoFiring = false;

        // Orientation
        this.isPortrait = false;

        // Settings (saved to localStorage)
        this.settings = this.loadSettings();

        // Check if mobile device
        if (this.isMobile()) {
            this.init();
        }
    }

    isMobile() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    loadSettings() {
        const saved = localStorage.getItem('mobileControlSettings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load mobile settings:', e);
            }
        }
        return {
            joystickSize: 120,
            buttonSize: 60,
            opacity: 0.6,
            joystickPosition: { left: 30, bottom: 30 },
            aimPosition: { right: 30, bottom: 30 },
            jumpPosition: { right: 30, bottom: 160 },
            reloadPosition: { right: 110, bottom: 160 }
        };
    }

    saveSettings() {
        localStorage.setItem('mobileControlSettings', JSON.stringify(this.settings));
    }

    init() {
        this.enabled = true;
        this.createUI();
        this.setupEventListeners();
        this.setupOrientationLock();
    }

    setupOrientationLock() {
        // Strict orientation lock
        const lockLandscape = () => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {
                    // Fail silently, CSS will handle the overlay
                });
            }
        };

        // Try to lock on any interaction
        document.addEventListener('touchstart', lockLandscape, { once: false, passive: true });
        document.addEventListener('click', lockLandscape, { once: false });

        // Check current orientation
        const checkOrientation = () => {
            this.isPortrait = window.innerHeight > window.innerWidth;
            const overlay = document.getElementById('orientationOverlay');
            if (overlay) {
                overlay.style.display = (this.isPortrait && this.isMobile()) ? 'flex' : 'none';
            }
        };

        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        checkOrientation();
    }

    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'mobileControls';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(this.container);

        // Create Move Joystick (Left)
        this.moveJoystickBase = this.createJoystickUI('move', this.settings.joystickPosition);
        this.moveJoystickKnob = this.moveJoystickBase.querySelector('.mobile-joystick-knob');

        // Create Aim Joystick (Right)
        this.aimJoystickBase = this.createJoystickUI('aim', this.settings.aimPosition);
        this.aimJoystickKnob = this.aimJoystickBase.querySelector('.mobile-joystick-knob');
        this.aimJoystickKnob.classList.add('aim-knob');

        // Create functional buttons
        this.createButton('jump', '⬆️', this.settings.jumpPosition);
        this.createButton('reload', '🔄', this.settings.reloadPosition);

        // Add Menu button in top right
        const menuBtn = this.createButton('menu', '⏸️', { right: 20, top: 20 });
        menuBtn.style.background = 'rgba(255, 107, 157, 0.7)';
        menuBtn.style.border = '3px solid rgba(255, 107, 157, 0.9)';

        this.createStatButtons();
    }

    createJoystickUI(name, position) {
        const size = this.settings.joystickSize;
        const base = document.createElement('div');
        base.className = `mobile-joystick-base mobile-joystick-${name}`;

        let posStyle = '';
        if (position.left !== undefined) posStyle += `left: ${position.left}px;`;
        if (position.right !== undefined) posStyle += `right: ${position.right}px;`;
        if (position.bottom !== undefined) posStyle += `bottom: ${position.bottom}px;`;
        if (position.top !== undefined) posStyle += `top: ${position.top}px;`;

        base.style.cssText = `
            position: fixed;
            ${posStyle}
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, ${this.settings.opacity * 0.3});
            border: 3px solid rgba(255, 255, 255, ${this.settings.opacity});
            pointer-events: auto;
            touch-action: none;
        `;

        const knob = document.createElement('div');
        knob.className = 'mobile-joystick-knob';
        knob.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            width: ${size * 0.4}px;
            height: ${size * 0.4}px;
            margin-left: -${size * 0.2}px;
            margin-top: -${size * 0.2}px;
            border-radius: 50%;
            background: rgba(255, 107, 157, ${this.settings.opacity});
            box-shadow: 0 0 10px rgba(255, 107, 157, 0.5);
            transition: transform 0.05s ease-out;
        `;

        base.appendChild(knob);
        this.container.appendChild(base);
        return base;
    }

    createButton(name, emoji, position) {
        const size = this.settings.buttonSize;
        const btn = document.createElement('div');
        btn.className = `mobile-btn mobile-btn-${name}`;
        btn.dataset.action = name;

        let posStyle = '';
        if (position.right !== undefined) posStyle += `right: ${position.right}px;`;
        if (position.left !== undefined) posStyle += `left: ${position.left}px;`;
        if (position.bottom !== undefined) posStyle += `bottom: ${position.bottom}px;`;
        if (position.top !== undefined) posStyle += `top: ${position.top}px;`;

        btn.style.cssText = `
            position: fixed;
            ${posStyle}
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(78, 205, 196, ${this.settings.opacity * 0.5});
            border: 3px solid rgba(78, 205, 196, ${this.settings.opacity});
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${size * 0.5}px;
            pointer-events: auto;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
        `;
        btn.textContent = emoji;

        this.container.appendChild(btn);
        return btn;
    }

    createStatButtons() {
        this.statContainer = document.createElement('div');
        this.statContainer.id = 'mobileStatButtons';
        this.statContainer.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            display: none;
            flex-direction: row;
            gap: 8px;
            z-index: 1001;
            pointer-events: auto;
        `;

        const stats = [
            { key: 'speed', label: 'SPD', emoji: '⚡' },
            { key: 'health', label: 'HP', emoji: '❤️' },
            { key: 'ammo', label: 'AMO', emoji: '🎯' },
            { key: 'jump', label: 'JMP', emoji: '🦘' },
            { key: 'dash', label: 'DSH', emoji: '💨' },
            { key: 'aim', label: 'AIM', emoji: '🔭' }
        ];

        stats.forEach((stat) => {
            const btn = document.createElement('div');
            btn.className = 'mobile-stat-btn';
            btn.dataset.stat = stat.key;
            btn.style.cssText = `
                width: 50px;
                height: 50px;
                border-radius: 8px;
                background: rgba(255, 230, 109, 0.7);
                border: 2px solid rgba(255, 230, 109, 1);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                touch-action: none;
                user-select: none;
            `;
            btn.innerHTML = `<span style="font-size: 16px;">${stat.emoji}</span><span style="font-size: 10px; color: #333;">${stat.label}</span>`;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.statPressed = stat.key;
                btn.style.transform = 'scale(0.9)';
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.style.transform = 'scale(1)';
            }, { passive: false });

            this.statContainer.appendChild(btn);
        });

        this.container.appendChild(this.statContainer);
    }

    showStatButtons() {
        if (this.statContainer) this.statContainer.style.display = 'flex';
    }

    hideStatButtons() {
        if (this.statContainer) this.statContainer.style.display = 'none';
    }

    setupEventListeners() {
        // Move Joystick
        this.moveJoystickBase.addEventListener('touchstart', (e) => this.onJoystickStart(e, 'move'), { passive: false });
        this.moveJoystickBase.addEventListener('touchmove', (e) => this.onJoystickMove(e, 'move'), { passive: false });
        this.moveJoystickBase.addEventListener('touchend', (e) => this.onJoystickEnd(e, 'move'), { passive: false });
        this.moveJoystickBase.addEventListener('touchcancel', (e) => this.onJoystickEnd(e, 'move'), { passive: false });

        // Aim Joystick
        this.aimJoystickBase.addEventListener('touchstart', (e) => this.onJoystickStart(e, 'aim'), { passive: false });
        this.aimJoystickBase.addEventListener('touchmove', (e) => this.onJoystickMove(e, 'aim'), { passive: false });
        this.aimJoystickBase.addEventListener('touchend', (e) => this.onJoystickEnd(e, 'aim'), { passive: false });
        this.aimJoystickBase.addEventListener('touchcancel', (e) => this.onJoystickEnd(e, 'aim'), { passive: false });

        // Buttons
        const buttons = this.container.querySelectorAll('.mobile-btn');
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => this.onButtonStart(e), { passive: false });
            btn.addEventListener('touchend', (e) => this.onButtonEnd(e), { passive: false });
            btn.addEventListener('touchcancel', (e) => this.onButtonEnd(e), { passive: false });
        });
    }

    onJoystickStart(e, type) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const state = type === 'move' ? this.moveJoystick : this.aimJoystick;
        const base = type === 'move' ? this.moveJoystickBase : this.aimJoystickBase;

        state.touchId = touch.identifier;
        state.active = true;

        const rect = base.getBoundingClientRect();
        state.center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        state.radius = rect.width / 2;

        if (type === 'aim') {
            const now = Date.now();
            if (now - this.lastTapTime < this.doubleTapThreshold) {
                // Double tap detected!
                this.shootHeld = true;
                this.isAutoFiring = true; // Hold for auto
            }
            this.lastTapTime = now;
        }

        this.updateJoystick(touch.clientX, touch.clientY, type);
    }

    onJoystickMove(e, type) {
        e.preventDefault();
        const state = type === 'move' ? this.moveJoystick : this.aimJoystick;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === state.touchId) {
                this.updateJoystick(touch.clientX, touch.clientY, type);
                break;
            }
        }
    }

    onJoystickEnd(e, type) {
        e.preventDefault();
        const state = type === 'move' ? this.moveJoystick : this.aimJoystick;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === state.touchId) {
                state.touchId = null;
                state.active = false;
                state.x = 0;
                state.y = 0;
                if (type === 'move') state.z = 0;

                const knob = type === 'move' ? this.moveJoystickKnob : this.aimJoystickKnob;
                knob.style.transform = 'translate(0, 0)';

                if (type === 'aim') {
                    this.shootHeld = false;
                    this.isAutoFiring = false;
                }
                break;
            }
        }
    }

    updateJoystick(touchX, touchY, type) {
        const state = type === 'move' ? this.moveJoystick : this.aimJoystick;
        const dx = touchX - state.center.x;
        const dy = touchY - state.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = state.radius * 0.8;

        let normX = dx / maxDist;
        let normY = dy / maxDist;

        if (distance > maxDist) {
            normX = (dx / distance);
            normY = (dy / distance);
        }

        state.x = Math.max(-1, Math.min(1, normX));
        if (type === 'move') {
            state.z = Math.max(-1, Math.min(1, normY));
        } else {
            state.y = Math.max(-1, Math.min(1, normY));
        }

        const knob = type === 'move' ? this.moveJoystickKnob : this.aimJoystickKnob;
        const knobX = Math.min(maxDist, Math.max(-maxDist, dx * (maxDist / Math.max(distance, 1))));
        const knobY = Math.min(maxDist, Math.max(-maxDist, dy * (maxDist / Math.max(distance, 1))));
        knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }

    onButtonStart(e) {
        e.preventDefault();
        const action = e.target.dataset.action;
        e.target.style.transform = 'scale(0.9)';

        switch (action) {
            case 'jump': this.jumpPressed = true; break;
            case 'reload': this.reloadPressed = true; break;
            case 'menu': this.game.toggleIngameMenu(); break;
        }
    }

    onButtonEnd(e) {
        e.preventDefault();
        const action = e.target.dataset.action;
        e.target.style.transform = 'scale(1)';

        switch (action) {
            case 'jump': this.jumpPressed = false; break;
            case 'reload': this.reloadPressed = false; break;
        }
    }

    getMovementVector() {
        return { x: this.moveJoystick.x, z: this.moveJoystick.z };
    }

    getAimDelta() {
        // Stick aim returns direct values that will be scaled by sensitivity
        if (!this.aimJoystick.active) return null;
        // Adjust sensitivity for the stick (it's continuous, so we need a factor)
        const sensitivity = 5.0;
        return {
            x: this.aimJoystick.x * sensitivity,
            y: this.aimJoystick.y * sensitivity
        };
    }

    isShootHeld() {
        return this.shootHeld || this.isAutoFiring;
    }

    isJumpHeld() {
        return this.jumpPressed;
    }

    consumeJump() {
        if (this.jumpPressed) {
            this.jumpPressed = false;
            return true;
        }
        return false;
    }

    consumeReload() {
        if (this.reloadPressed) {
            this.reloadPressed = false;
            return true;
        }
        return false;
    }

    consumeStat() {
        if (this.statPressed) {
            const stat = this.statPressed;
            this.statPressed = null;
            return stat;
        }
        return false;
    }

    show() {
        if (this.container) this.container.style.display = 'block';
    }

    hide() {
        if (this.container) this.container.style.display = 'none';
    }

    openSettings() {
        // Re-use logic or implement minimalist settings modal
        // (Keeping it simple for now)
    }

    rebuildUI() {
        if (this.container) this.container.remove();
        this.createUI();
        this.setupEventListeners();
        if (this.game.gameState === 'playing') this.show();
    }

    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}

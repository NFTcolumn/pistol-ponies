// Mobile Controls - Touch input for mobile players
export class MobileControls {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.container = null;

        // Control states
        this.moveJoystick = { x: 0, z: 0, active: false, touchId: null, center: { x: 0, y: 0 } };
        this.aimJoystick = { x: 0, y: 0, active: false, touchId: null, center: { x: 0, y: 0 } };
        this.shootHeld = false;
        this.jumpPressed = false;
        this.reloadPressed = false;
        this.statPressed = null;

        // Double tap / Flick to dash tracking
        this.lastTapTime = 0;
        this.doubleTapThreshold = 300; // ms
        this.flickThreshold = 0.8; // 80% distance for flick-to-dash
        this.isAutoFiring = false;
        this.isDashing = false;

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
            hudScale: 1.0,
            moveSensitivity: 1.0,
            aimSensitivity: 1.0,
            leftyMode: false,
            dynamicJoysticks: true,
            joystickPosition: { left: 40, bottom: 40 },
            aimPosition: { right: 40, bottom: 40 },
            jumpPosition: { right: 40, bottom: 220 },
            reloadPosition: { right: 140, bottom: 220 },
            shootPosition: { right: 40, bottom: 90 }
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
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 20px;
        `;
        document.body.appendChild(this.container);

        // Layout Container based on wireframe (3 columns)
        const layout = document.createElement('div');
        layout.style.cssText = `
            display: flex;
            width: 90%;
            max-width: 900px;
            height: 300px;
            align-items: center;
            justify-content: space-between;
            pointer-events: none;
        `;
        this.container.appendChild(layout);

        // Left Area (Move Joystick)
        const leftArea = document.createElement('div');
        leftArea.style.cssText = `
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
        `;
        layout.appendChild(leftArea);

        // Center Area (Buttons Stack)
        const centerArea = document.createElement('div');
        centerArea.style.cssText = `
            width: 200px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: center;
            justify-content: center;
            height: 100%;
        `;
        layout.appendChild(centerArea);

        // Right Area (Aim Joystick)
        const rightArea = document.createElement('div');
        rightArea.style.cssText = `
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
        `;
        layout.appendChild(rightArea);

        // Initialize Joysticks
        this.moveJoystickBase = this.createJoystickUI('move', leftArea);
        this.moveJoystickKnob = this.moveJoystickBase.querySelector('.mobile-joystick-knob');

        this.aimJoystickBase = this.createJoystickUI('aim', rightArea);
        this.aimJoystickKnob = this.aimJoystickBase.querySelector('.mobile-joystick-knob');
        this.aimJoystickKnob.classList.add('aim-knob');

        // Center Buttons logic
        const btnStyle = `
            width: 160px;
            height: 80px;
            background: white;
            border: 2px solid black;
            display: flex;
            align-items: center;
            justify-content: center;
            color: black;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: normal;
            pointer-events: auto;
            touch-action: none;
            user-select: none;
            cursor: pointer;
        `;

        this.reloadBtn = this.createButton('reload', 'RELOAD', centerArea, btnStyle);
        this.jumpBtn = this.createButton('jump', 'JUMP', centerArea, btnStyle);

        // Add Pause button separately at the top
        const pauseBtn = document.createElement('div');
        pauseBtn.dataset.action = 'menu';
        pauseBtn.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 50px;
            height: 50px;
            background: rgba(255, 107, 157, 0.7);
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            touch-action: none;
            font-size: 20px;
        `;
        pauseBtn.textContent = '⏸️';
        this.container.appendChild(pauseBtn);

        this.createStatButtons();
    }

    createJoystickUI(name, parent) {
        const size = this.settings.joystickSize;
        const base = document.createElement('div');
        base.className = `mobile-joystick-base mobile-joystick-${name}`;

        base.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            border-radius: 4px;
            border: 1px solid rgba(0,0,0,0.2);
            position: relative;
            background: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const knob = document.createElement('div');
        knob.className = 'mobile-joystick-knob';
        knob.style.cssText = `
            width: ${size * 0.4}px;
            height: ${size * 0.4}px;
            border-radius: 50%;
            border: 1px solid black;
            background: transparent;
            position: absolute;
            pointer-events: none;
        `;

        base.appendChild(knob);
        parent.appendChild(base);
        return base;
    }

    createButton(name, text, parent, style) {
        const btn = document.createElement('div');
        btn.className = `mobile-btn mobile-btn-${name}`;
        btn.dataset.action = name;
        btn.style.cssText = style;
        btn.textContent = text;
        parent.appendChild(btn);
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
        // Full screen touch tracking for floating joysticks
        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchMove = this.handleTouchMove.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);

        document.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
        document.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
        document.addEventListener('touchend', this.boundHandleTouchEnd, { passive: false });
        document.addEventListener('touchcancel', this.boundHandleTouchEnd, { passive: false });
    }

    removeEventListeners() {
        if (this.boundHandleTouchStart) {
            document.removeEventListener('touchstart', this.boundHandleTouchStart);
            document.removeEventListener('touchmove', this.boundHandleTouchMove);
            document.removeEventListener('touchend', this.boundHandleTouchEnd);
            document.removeEventListener('touchcancel', this.boundHandleTouchEnd);
        }
    }

    handleTouchStart(e) {
        if (this.game.gameState !== 'playing' || this.game.ingameMenu.isVisible()) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const x = touch.clientX;
            const y = touch.clientY;
            const width = window.innerWidth;

            // Determine which side of screen was touched
            const isLeftHalf = x < width / 2;
            const isMoveSide = this.settings.leftyMode ? !isLeftHalf : isLeftHalf;

            // Check if touch is on a button
            const target = document.elementFromPoint(x, y);
            const btn = target?.closest('.mobile-btn') || target?.closest('.mobile-stat-btn');

            if (btn) {
                if (btn.classList.contains('mobile-btn')) {
                    this.onButtonStart({ target: btn, preventDefault: () => { } });
                }
                // Stat buttons have their own listeners added in createStatButtons
                continue;
            }

            if (isMoveSide && !this.moveJoystick.active) {
                if (this.settings.dynamicJoysticks) {
                    this.onJoystickStart(touch, 'move');
                } else {
                    // Static mode: check if touch is inside the existing base
                    const rect = this.moveJoystickBase.getBoundingClientRect();
                    const dist = Math.sqrt(Math.pow(x - (rect.left + rect.width / 2), 2) + Math.pow(y - (rect.top + rect.height / 2), 2));
                    if (dist < rect.width / 2 * 1.5) { // 1.5x buffer for easier pickup
                        this.onJoystickStart(touch, 'move');
                    }
                }
            } else if (!isMoveSide && !this.aimJoystick.active) {
                if (this.settings.dynamicJoysticks) {
                    this.onJoystickStart(touch, 'aim');
                } else {
                    const rect = this.aimJoystickBase.getBoundingClientRect();
                    const dist = Math.sqrt(Math.pow(x - (rect.left + rect.width / 2), 2) + Math.pow(y - (rect.top + rect.height / 2), 2));
                    if (dist < rect.width / 2 * 1.5) {
                        this.onJoystickStart(touch, 'aim');
                    }
                }
            }
        }
    }

    handleTouchMove(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.moveJoystick.touchId) {
                this.updateJoystick(touch.clientX, touch.clientY, 'move');
            } else if (touch.identifier === this.aimJoystick.touchId) {
                this.updateJoystick(touch.clientX, touch.clientY, 'aim');
            }
        }
    }

    handleTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            // Check if it was a button touch
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const btn = target?.closest('.mobile-btn');
            if (btn) {
                this.onButtonEnd({ target: btn, preventDefault: () => { } });
            }

            if (touch.identifier === this.moveJoystick.touchId) {
                this.onJoystickEnd(touch, 'move');
            } else if (touch.identifier === this.aimJoystick.touchId) {
                this.onJoystickEnd(touch, 'aim');
            }
        }
    }

    onJoystickStart(touch, type) {
        const state = type === 'move' ? this.moveJoystick : this.aimJoystick;
        const base = type === 'move' ? this.moveJoystickBase : this.aimJoystickBase;
        const size = this.settings.joystickSize;

        state.touchId = touch.identifier;
        state.active = true;

        // Static layout: calculate center from the base element
        const rect = base.getBoundingClientRect();
        state.center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };

        state.radius = size / 2;

        const now = Date.now();
        if (type === 'aim') {
            if (now - this.lastTapTime < this.doubleTapThreshold) {
                this.shootHeld = true;
                this.isAutoFiring = true;
            }
        }

        if (type === 'move') {
            if (now - this.lastTapTime < this.doubleTapThreshold) {
                this.isDashing = true;
                setTimeout(() => { this.isDashing = false; }, 150);
            }
        }
        this.lastTapTime = now;

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

    onJoystickEnd(touch, type) {
        const state = type === 'move' ? this.moveJoystick : this.aimJoystick;
        if (touch.identifier === state.touchId) {
            state.touchId = null;
            state.active = false;
            state.x = 0;
            state.y = 0;
            if (type === 'move') state.z = 0;

            const base = type === 'move' ? this.moveJoystickBase : this.aimJoystickBase;
            const knob = type === 'move' ? this.moveJoystickKnob : this.aimJoystickKnob;
            knob.style.transform = 'translate(0, 0)';

            if (this.settings.dynamicJoysticks) {
                base.style.display = 'none';
            }

            if (type === 'aim') {
                this.shootHeld = false;
                this.isAutoFiring = false;
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
            case 'shoot': this.shootHeld = true; break;
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
            case 'shoot': this.shootHeld = false; break;
        }
    }

    getMovementVector() {
        if (!this.moveJoystick.active) return { x: 0, z: 0 };
        return {
            x: this.moveJoystick.x * this.settings.moveSensitivity,
            z: this.moveJoystick.z * this.settings.moveSensitivity
        };
    }

    getAimDelta() {
        if (!this.aimJoystick.active) return null;
        // Sensitivity scaling for analog stick
        const baseSensitivity = 2.58; // Reduced by 14% from 3.0 (total 48.4% reduction from original 5.0)
        return {
            x: this.aimJoystick.x * baseSensitivity * this.settings.aimSensitivity,
            y: this.aimJoystick.y * baseSensitivity * this.settings.aimSensitivity
        };
    }

    isShootHeld() {
        return this.shootHeld || this.isAutoFiring;
    }

    isJumpHeld() {
        return this.jumpPressed;
    }

    getDash() {
        if (this.isDashing) {
            this.isDashing = false;
            return true;
        }
        return false;
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
        if (document.getElementById('mobileSettingsModal')) return;

        const modal = document.createElement('div');
        modal.id = 'mobileSettingsModal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 400px;
            background: rgba(32, 43, 72, 0.95);
            backdrop-filter: blur(10px);
            border: 2px solid #ff6b9d;
            border-radius: 20px;
            padding: 30px;
            z-index: 10000;
            color: white;
            pointer-events: auto;
        `;

        modal.innerHTML = `
            <h2 style="text-align: center; color: #ff6b9d; margin-bottom: 20px;">📱 MOBILE SETTINGS</h2>
            
            <div class="setting-item" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px;">HUD Scale: <span id="val-hudScale">${this.settings.hudScale.toFixed(1)}</span></label>
                <input type="range" id="set-hudScale" min="0.5" max="1.5" step="0.1" value="${this.settings.hudScale}" style="width: 100%;">
            </div>

            <div class="setting-item" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px;">Move Sensitivity: <span id="val-moveSens">${this.settings.moveSensitivity.toFixed(1)}</span></label>
                <input type="range" id="set-moveSens" min="0.5" max="3.0" step="0.1" value="${this.settings.moveSensitivity}" style="width: 100%;">
            </div>

            <div class="setting-item" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px;">Aim Sensitivity: <span id="val-aimSens">${this.settings.aimSensitivity.toFixed(1)}</span></label>
                <input type="range" id="set-aimSens" min="0.5" max="3.0" step="0.1" value="${this.settings.aimSensitivity}" style="width: 100%;">
            </div>

            <div class="setting-item" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <label>Lefty Mode</label>
                <input type="checkbox" id="set-lefty" ${this.settings.leftyMode ? 'checked' : ''} style="width: 24px; height: 24px;">
            </div>

            <div class="setting-item" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <label>Floating Joysticks</label>
                <input type="checkbox" id="set-dynamic" ${this.settings.dynamicJoysticks ? 'checked' : ''} style="width: 24px; height: 24px;">
            </div>

            <button id="closeMobileSettings" class="btn btn-primary" style="width: 100%; margin-top: 10px;">SAVE & CLOSE</button>
        `;

        document.body.appendChild(modal);

        // Events
        const updateVal = (id, val) => document.getElementById(`val-${id}`).textContent = parseFloat(val).toFixed(1);

        modal.querySelector('#set-hudScale').addEventListener('input', (e) => {
            this.settings.hudScale = parseFloat(e.target.value);
            updateVal('hudScale', e.target.value);
        });

        modal.querySelector('#set-moveSens').addEventListener('input', (e) => {
            this.settings.moveSensitivity = parseFloat(e.target.value);
            updateVal('moveSens', e.target.value);
        });

        modal.querySelector('#set-aimSens').addEventListener('input', (e) => {
            this.settings.aimSensitivity = parseFloat(e.target.value);
            updateVal('aimSens', e.target.value);
        });

        modal.querySelector('#set-lefty').addEventListener('change', (e) => {
            this.settings.leftyMode = e.target.checked;
        });

        modal.querySelector('#set-dynamic').addEventListener('change', (e) => {
            this.settings.dynamicJoysticks = e.target.checked;
        });

        modal.querySelector('#closeMobileSettings').addEventListener('click', () => {
            this.saveSettings();
            modal.remove();
            this.rebuildUI();
        });
    }

    rebuildUI() {
        if (this.container) this.container.remove();
        this.removeEventListeners();
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

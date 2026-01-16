// Mobile Controls - Touch input for mobile players
export class MobileControls {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.container = null;

        // Control states
        this.joystick = { x: 0, z: 0, active: false };
        this.shootHeld = false;
        this.jumpPressed = false;
        this.reloadPressed = false;
        this.statPressed = null; // For stat allocation

        // Touch tracking
        this.joystickTouch = null;
        this.joystickCenter = { x: 0, y: 0 };
        this.joystickRadius = 60;

        // Touch aiming (replaces gyro)
        this.aimTouch = null;
        this.aimDelta = { x: 0, y: 0 };
        this.lastAimPos = { x: 0, y: 0 };

        // Double tap to shoot
        this.lastTapTime = 0;
        this.doubleTapThreshold = 300; // ms

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
            shootPosition: { right: 30, bottom: 100 },
            jumpPosition: { right: 100, bottom: 30 },
            reloadPosition: { right: 170, bottom: 30 }
        };
    }

    saveSettings() {
        localStorage.setItem('mobileControlSettings', JSON.stringify(this.settings));
    }

    init() {
        this.enabled = true;
        this.createUI();
        this.setupEventListeners();
        this.setupTouchAim();
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

        // Create joystick
        this.createJoystick();

        // Create buttons - keep only jump and reload, shoot is now double-tap
        this.createButton('jump', '⬆️', this.settings.jumpPosition);
        this.createButton('reload', '🔄', this.settings.reloadPosition);

        // Create stat allocation buttons (shown when skill points available)
        this.createStatButtons();
    }

    createJoystick() {
        const size = this.settings.joystickSize;
        const pos = this.settings.joystickPosition;

        this.joystickBase = document.createElement('div');
        this.joystickBase.className = 'mobile-joystick-base';
        this.joystickBase.style.cssText = `
            position: fixed;
            left: ${pos.left}px;
            bottom: ${pos.bottom}px;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, ${this.settings.opacity * 0.3});
            border: 3px solid rgba(255, 255, 255, ${this.settings.opacity});
            pointer-events: auto;
            touch-action: none;
        `;

        this.joystickKnob = document.createElement('div');
        this.joystickKnob.className = 'mobile-joystick-knob';
        this.joystickKnob.style.cssText = `
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
        `;

        this.joystickBase.appendChild(this.joystickKnob);
        this.container.appendChild(this.joystickBase);
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
        // Create stat button container (hidden by default, shown when skill points available)
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

        stats.forEach((stat, idx) => {
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
        if (this.statContainer) {
            this.statContainer.style.display = 'flex';
        }
    }

    hideStatButtons() {
        if (this.statContainer) {
            this.statContainer.style.display = 'none';
        }
    }

    setupTouchAim() {
        // Touch aim zone covers right 60% of screen (left is for joystick)
        // Double tap anywhere on right side to shoot
        const gameCanvas = document.getElementById('gameCanvas');
        if (!gameCanvas) return;

        // We'll listen on the document for touches not on controls
        document.addEventListener('touchstart', (e) => this.onAimTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onAimTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onAimTouchEnd(e), { passive: false });
    }

    isOnControl(touch) {
        // Check if touch is on joystick or buttons
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!el) return false;
        return el.closest('.mobile-joystick-base') ||
            el.closest('.mobile-btn') ||
            el.closest('.mobile-stat-btn') ||
            el.closest('#mobileSettingsModal');
    }

    onAimTouchStart(e) {
        if (!this.enabled || this.game.gameState !== 'playing') return;

        for (const touch of e.changedTouches) {
            // Skip if on a control
            if (this.isOnControl(touch)) continue;

            // Check if this is in the right ~60% of screen (aim zone)
            if (touch.clientX > window.innerWidth * 0.35) {
                // Check for double tap
                const now = Date.now();
                if (now - this.lastTapTime < this.doubleTapThreshold) {
                    // Double tap = shoot!
                    this.shootHeld = true;
                    setTimeout(() => { this.shootHeld = false; }, 100);
                }
                this.lastTapTime = now;

                // Start aim tracking
                if (this.aimTouch === null) {
                    this.aimTouch = touch.identifier;
                    this.lastAimPos = { x: touch.clientX, y: touch.clientY };
                    e.preventDefault();
                }
            }
        }
    }

    onAimTouchMove(e) {
        if (!this.enabled || this.aimTouch === null) return;

        for (const touch of e.changedTouches) {
            if (touch.identifier === this.aimTouch) {
                // Calculate delta from last position
                const deltaX = touch.clientX - this.lastAimPos.x;
                const deltaY = touch.clientY - this.lastAimPos.y;

                // Accumulate aim delta (will be consumed by getAimDelta)
                this.aimDelta.x += deltaX;
                this.aimDelta.y += deltaY;

                this.lastAimPos = { x: touch.clientX, y: touch.clientY };
                e.preventDefault();
            }
        }
    }

    onAimTouchEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.aimTouch) {
                this.aimTouch = null;
            }
        }
    }

    getAimDelta() {
        // Return accumulated aim delta and reset
        const delta = { x: this.aimDelta.x, y: this.aimDelta.y };
        this.aimDelta.x = 0;
        this.aimDelta.y = 0;
        if (delta.x === 0 && delta.y === 0) return null;
        return delta;
    }

    setupEventListeners() {
        // Joystick touch events
        this.joystickBase.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
        this.joystickBase.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
        this.joystickBase.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false });
        this.joystickBase.addEventListener('touchcancel', (e) => this.onJoystickEnd(e), { passive: false });

        // Button touch events
        const buttons = this.container.querySelectorAll('.mobile-btn');
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => this.onButtonStart(e), { passive: false });
            btn.addEventListener('touchend', (e) => this.onButtonEnd(e), { passive: false });
            btn.addEventListener('touchcancel', (e) => this.onButtonEnd(e), { passive: false });
        });
    }

    onJoystickStart(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.joystickTouch = touch.identifier;

        const rect = this.joystickBase.getBoundingClientRect();
        this.joystickCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        this.joystickRadius = rect.width / 2;

        this.joystick.active = true;
        this.updateJoystick(touch.clientX, touch.clientY);
    }

    onJoystickMove(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this.joystickTouch) {
                this.updateJoystick(touch.clientX, touch.clientY);
                break;
            }
        }
    }

    onJoystickEnd(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.joystickTouch) {
                this.joystickTouch = null;
                this.joystick = { x: 0, z: 0, active: false };
                this.resetJoystickKnob();
                break;
            }
        }
    }

    updateJoystick(touchX, touchY) {
        const dx = touchX - this.joystickCenter.x;
        const dy = touchY - this.joystickCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.joystickRadius * 0.8;

        // Normalize and clamp
        let normX = dx / maxDist;
        let normY = dy / maxDist;

        if (distance > maxDist) {
            normX = (dx / distance) * 1;
            normY = (dy / distance) * 1;
        }

        // Map to game coordinates (x = left/right, z = forward/back)
        this.joystick.x = Math.max(-1, Math.min(1, normX));
        this.joystick.z = Math.max(-1, Math.min(1, normY)); // Up is negative z (forward)

        // Update knob position
        const knobX = Math.min(maxDist, Math.max(-maxDist, dx));
        const knobY = Math.min(maxDist, Math.max(-maxDist, dy));
        this.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }

    resetJoystickKnob() {
        this.joystickKnob.style.transform = 'translate(0, 0)';
    }

    onButtonStart(e) {
        e.preventDefault();
        const action = e.target.dataset.action;
        e.target.style.transform = 'scale(0.9)';
        e.target.style.background = `rgba(255, 107, 157, ${this.settings.opacity})`;

        switch (action) {
            case 'shoot':
                this.shootHeld = true;
                break;
            case 'jump':
                this.jumpPressed = true;
                break;
            case 'reload':
                this.reloadPressed = true;
                break;
        }
    }

    onButtonEnd(e) {
        e.preventDefault();
        const action = e.target.dataset.action;
        e.target.style.transform = 'scale(1)';
        e.target.style.background = `rgba(78, 205, 196, ${this.settings.opacity * 0.5})`;

        switch (action) {
            case 'shoot':
                this.shootHeld = false;
                break;
            case 'jump':
                this.jumpPressed = false;
                break;
            case 'reload':
                this.reloadPressed = false;
                break;
        }
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    getMovementVector() {
        return { x: this.joystick.x, z: this.joystick.z };
    }

    isShootHeld() {
        return this.shootHeld;
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

    // Settings UI for customization
    openSettings() {
        // Create settings modal
        const modal = document.createElement('div');
        modal.id = 'mobileSettingsModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 2000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        `;

        modal.innerHTML = `
            <h2 style="color: #ff6b9d; margin-bottom: 30px; font-size: 24px;">Mobile Control Settings</h2>
            
            <div style="width: 100%; max-width: 300px;">
                <label style="color: white; display: block; margin-bottom: 10px;">
                    Joystick Size: <span id="joystickSizeValue">${this.settings.joystickSize}px</span>
                </label>
                <input type="range" id="joystickSizeSlider" min="80" max="180" value="${this.settings.joystickSize}"
                    style="width: 100%; margin-bottom: 20px;">

                <label style="color: white; display: block; margin-bottom: 10px;">
                    Button Size: <span id="buttonSizeValue">${this.settings.buttonSize}px</span>
                </label>
                <input type="range" id="buttonSizeSlider" min="40" max="100" value="${this.settings.buttonSize}"
                    style="width: 100%; margin-bottom: 20px;">

                <label style="color: white; display: block; margin-bottom: 10px;">
                    Opacity: <span id="opacityValue">${Math.round(this.settings.opacity * 100)}%</span>
                </label>
                <input type="range" id="opacitySlider" min="20" max="100" value="${Math.round(this.settings.opacity * 100)}"
                    style="width: 100%; margin-bottom: 30px;">
            </div>

            <button id="saveMobileSettings" style="
                background: #ff6b9d;
                border: none;
                padding: 15px 30px;
                color: white;
                font-size: 18px;
                border-radius: 10px;
                cursor: pointer;
                margin: 10px;
            ">Save Settings</button>
            
            <button id="closeMobileSettings" style="
                background: #4ecdc4;
                border: none;
                padding: 15px 30px;
                color: white;
                font-size: 18px;
                border-radius: 10px;
                cursor: pointer;
                margin: 10px;
            ">Close</button>
        `;

        document.body.appendChild(modal);

        // Event listeners for sliders
        const joystickSlider = modal.querySelector('#joystickSizeSlider');
        const buttonSlider = modal.querySelector('#buttonSizeSlider');
        const opacitySlider = modal.querySelector('#opacitySlider');

        joystickSlider.addEventListener('input', (e) => {
            modal.querySelector('#joystickSizeValue').textContent = e.target.value + 'px';
        });

        buttonSlider.addEventListener('input', (e) => {
            modal.querySelector('#buttonSizeValue').textContent = e.target.value + 'px';
        });

        opacitySlider.addEventListener('input', (e) => {
            modal.querySelector('#opacityValue').textContent = e.target.value + '%';
        });

        // Save button
        modal.querySelector('#saveMobileSettings').addEventListener('click', () => {
            this.settings.joystickSize = parseInt(joystickSlider.value);
            this.settings.buttonSize = parseInt(buttonSlider.value);
            this.settings.opacity = parseInt(opacitySlider.value) / 100;
            this.saveSettings();
            this.rebuildUI();
            modal.remove();
        });

        // Close button
        modal.querySelector('#closeMobileSettings').addEventListener('click', () => {
            modal.remove();
        });
    }

    rebuildUI() {
        if (this.container) {
            this.container.remove();
        }
        this.createUI();
        this.setupEventListeners();
        if (this.game.gameState === 'playing') {
            this.show();
        }
    }

    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}

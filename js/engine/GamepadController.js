// Gamepad Controller - Xbox/Bluetooth controller support
export class GamepadController {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.gamepad = null;
        this.gamepadIndex = null;

        // Controller state
        this.leftStick = { x: 0, y: 0 };
        this.rightStick = { x: 0, y: 0 };
        this.buttons = {
            a: false,           // Jump
            b: false,           // Dash right
            x: false,           // Dash left
            y: false,           // Dash forward
            lb: false,          // Left bumper
            rb: false,          // Right bumper (shoot)
            lt: 0,              // Left trigger
            rt: 0,              // Right trigger (shoot)
            menu: false,        // Menu button
            view: false,        // View button
            leftStickPress: false,
            rightStickPress: false,
            dpadUp: false,
            dpadDown: false,
            dpadLeft: false,
            dpadRight: false
        };

        // Button press tracking (for single-press actions)
        this.lastButtons = { ...this.buttons };
        this.dashTriggered = null;
        this.jumpPressed = false;
        this.shootPressed = false;
        this.menuPressed = false;

        // Dead zone for analog sticks
        this.deadzone = 0.15;

        // Aim sensitivity
        this.aimSensitivity = 3;

        this.init();
    }

    init() {
        // Listen for gamepad connections
        window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
        window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));

        // Check if gamepad is already connected
        this.pollGamepads();
    }

    onGamepadConnected(e) {
        console.log(`Gamepad connected: ${e.gamepad.id}`);
        this.gamepadIndex = e.gamepad.index;
        this.enabled = true;

        // Show notification (could integrate with HUD later)
        console.log('🎮 Controller connected! Use left stick to move, right stick to aim.');
    }

    onGamepadDisconnected(e) {
        if (e.gamepad.index === this.gamepadIndex) {
            console.log('Gamepad disconnected');
            this.gamepadIndex = null;
            this.enabled = false;
            this.resetState();
        }
    }

    pollGamepads() {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
            if (gp && this.gamepadIndex === null) {
                this.gamepadIndex = gp.index;
                this.enabled = true;
                console.log(`Found gamepad: ${gp.id}`);
            }
        }
    }

    resetState() {
        this.leftStick = { x: 0, y: 0 };
        this.rightStick = { x: 0, y: 0 };
        this.dashTriggered = null;
        this.jumpPressed = false;
        this.shootPressed = false;
    }

    applyDeadzone(value) {
        if (Math.abs(value) < this.deadzone) return 0;
        // Rescale so it starts from 0 after deadzone
        const sign = value > 0 ? 1 : -1;
        return sign * ((Math.abs(value) - this.deadzone) / (1 - this.deadzone));
    }

    update() {
        if (this.gamepadIndex === null) {
            this.pollGamepads();
            return;
        }

        const gamepads = navigator.getGamepads();
        const gp = gamepads[this.gamepadIndex];

        if (!gp) {
            this.resetState();
            return;
        }

        // Store previous button states
        this.lastButtons = { ...this.buttons };

        // Xbox Controller mapping (Standard Gamepad):
        // Buttons: 0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 6=LT, 7=RT, 8=View, 9=Menu, 10=LS, 11=RS
        // D-Pad: 12=Up, 13=Down, 14=Left, 15=Right
        // Axes: 0=LS X, 1=LS Y, 2=RS X, 3=RS Y

        // Left stick (movement)
        this.leftStick.x = this.applyDeadzone(gp.axes[0]);
        this.leftStick.y = this.applyDeadzone(gp.axes[1]);

        // Right stick (aiming)
        this.rightStick.x = this.applyDeadzone(gp.axes[2]);
        this.rightStick.y = this.applyDeadzone(gp.axes[3]);

        // Buttons
        this.buttons.a = gp.buttons[0]?.pressed || false;           // A - Jump
        this.buttons.b = gp.buttons[1]?.pressed || false;           // B - Dash right
        this.buttons.x = gp.buttons[2]?.pressed || false;           // X - Dash left
        this.buttons.y = gp.buttons[3]?.pressed || false;           // Y - Dash forward
        this.buttons.lb = gp.buttons[4]?.pressed || false;          // LB - Reload
        this.buttons.rb = gp.buttons[5]?.pressed || false;          // RB - Shoot
        this.buttons.lt = gp.buttons[6]?.value || 0;                // LT (analog)
        this.buttons.rt = gp.buttons[7]?.value || 0;                // RT - Shoot (analog)
        this.buttons.view = gp.buttons[8]?.pressed || false;        // View
        this.buttons.menu = gp.buttons[9]?.pressed || false;        // Menu
        this.buttons.leftStickPress = gp.buttons[10]?.pressed || false;
        this.buttons.rightStickPress = gp.buttons[11]?.pressed || false;

        // D-Pad
        this.buttons.dpadUp = gp.buttons[12]?.pressed || false;
        this.buttons.dpadDown = gp.buttons[13]?.pressed || false;
        this.buttons.dpadLeft = gp.buttons[14]?.pressed || false;
        this.buttons.dpadRight = gp.buttons[15]?.pressed || false;

        // Detect button presses (rising edge)
        this.jumpPressed = this.buttons.a && !this.lastButtons.a;
        this.shootPressed = (this.buttons.rb && !this.lastButtons.rb) ||
            (this.buttons.rt > 0.5 && this.lastButtons.rt <= 0.5);
        this.menuPressed = this.buttons.menu && !this.lastButtons.menu;

        // Dash detection (on button press)
        if (this.buttons.y && !this.lastButtons.y) {
            this.dashTriggered = 'forward';
        } else if (this.buttons.x && !this.lastButtons.x) {
            this.dashTriggered = 'left';
        } else if (this.buttons.b && !this.lastButtons.b) {
            this.dashTriggered = 'right';
        }
    }

    // Get movement vector from left stick
    getMovementVector() {
        return {
            x: this.leftStick.x,
            z: this.leftStick.y  // Y axis on stick maps to Z (forward/back)
        };
    }

    // Get aim delta from right stick (scaled for sensitivity)
    getAimDelta() {
        if (this.rightStick.x === 0 && this.rightStick.y === 0) return null;
        return {
            x: this.rightStick.x * this.aimSensitivity,
            y: this.rightStick.y * this.aimSensitivity
        };
    }

    // Consume jump press
    consumeJump() {
        if (this.jumpPressed) {
            this.jumpPressed = false;
            return true;
        }
        return false;
    }

    // Consume shoot press
    consumeShoot() {
        if (this.shootPressed) {
            this.shootPressed = false;
            return true;
        }
        return false;
    }

    // Check if shoot is held (for continuous fire)
    isShootHeld() {
        return this.buttons.rb || this.buttons.rt > 0.5;
    }

    // Check if reload is pressed
    isReloadPressed() {
        return this.buttons.lb;
    }

    // Consume dash
    consumeDash() {
        const dash = this.dashTriggered;
        this.dashTriggered = null;
        return dash;
    }

    // Consume menu press
    consumeMenu() {
        if (this.menuPressed) {
            this.menuPressed = false;
            return true;
        }
        return false;
    }

    // Get D-Pad for stat allocation (1-6 mapping)
    getStatInput() {
        // D-Pad + button combos for stats
        // DPad Up = Speed (1)
        // DPad Right = Health (2)
        // DPad Down = Ammo (3)
        // DPad Left = Jump (4)
        // LB + DPad Up = Dash (5)
        // LB + DPad Right = Aim (6)
        if (this.buttons.lb) {
            if (this.buttons.dpadUp && !this.lastButtons.dpadUp) return 'dash';
            if (this.buttons.dpadRight && !this.lastButtons.dpadRight) return 'aim';
        } else {
            if (this.buttons.dpadUp && !this.lastButtons.dpadUp) return 'speed';
            if (this.buttons.dpadRight && !this.lastButtons.dpadRight) return 'health';
            if (this.buttons.dpadDown && !this.lastButtons.dpadDown) return 'ammo';
            if (this.buttons.dpadLeft && !this.lastButtons.dpadLeft) return 'jump';
        }
        return null;
    }
}

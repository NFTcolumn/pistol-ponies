// Sound Manager
export class SoundManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        this.audioContext = null;
        this.buffers = new Map();
        this.stepLoop = null; // Store source for looping steps
        this.airborneLoop = null; // Store source for looping airborne sound
        this.reloadSource = null; // Track current reload sound to prevent overlap

        // Sound definitions
        this.files = {
            jump: '/sfx/Airborne.wav',
            land: '/sfx/Landing.wav',
            hit: '/sfx/Hit.wav',
            imHit: '/sfx/imHit.wav',
            youShotMe: '/sfx/death.wav',
            steps: '/sfx/Steps.wav',
            theme: '/sfx/Pistol Ponies Theme.wav',
            shoot: '/sfx/Pyoom.wav',

            // Random groups (handled by logic, but preloaded here)
            headshot1: '/sfx/headshot1.wav',
            headshot2: '/sfx/headshot2.wav',

            reload1: '/sfx/reload1.wav',
            reload2: '/sfx/reload2.wav',
            reload3: '/sfx/reload3.wav',

            dash1: '/sfx/wooshhh1.wav',
            dash2: '/sfx/wooshhh2.wav',
            background: '/sfx/Background_Loop.mp3'
        };

        // Try to initialize Web Audio API
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    async loadSounds() {
        if (!this.audioContext) return;

        console.log('Loading sounds...');
        const promises = Object.entries(this.files).map(async ([key, url]) => {
            try {
                const response = await fetch(encodeURI(url));
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.buffers.set(key, audioBuffer);
            } catch (err) {
                console.warn(`Failed to load sound: ${key} (${url})`, err);
            }
        });

        await Promise.all(promises);
        console.log('Sounds loaded successfully:', this.buffers.size, '/', Object.keys(this.files).length);
        if (this.buffers.size < Object.keys(this.files).length) {
            const missing = Object.keys(this.files).filter(k => !this.buffers.has(k));
            console.warn('Missing sounds:', missing);
        }
    }

    play(key, options = {}) {
        if (!this.enabled || !this.audioContext || !this.buffers.has(key)) {
            console.warn(`[SoundManager] Cannot play ${key}: enabled=${this.enabled}, ctx=${!!this.audioContext}, buffer=${this.buffers.has(key)}`);
            return null;
        }
        console.log(`[SoundManager] Playing: ${key}`);

        // Resume context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.buffers.get(key);

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = (options.volume || 1.0) * this.volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.loop = options.loop || false;

        // Random pitch variation slightly (except for music/steps maybe?)
        if (options.varyPitch) {
            source.playbackRate.value = 0.95 + Math.random() * 0.1;
        }

        source.start(0);
        source.gainNode = gainNode; // Expose gainNode for fade-in/out
        return source;
    }

    // --- Specific Triggers ---

    playJump() {
        // Use dash sound for one-shot jump to distinguish from airborne loop
        this.play('dash1', { volume: 0.8, varyPitch: true });
    }

    playLand() {
        this.play('land', { volume: 0.9 });
    }

    playHit() {
        // When we hit someone else
        this.play('hit', { volume: 0.8, varyPitch: true });
    }

    playHeadshot() {
        console.log('[SoundManager] Triggering headshot sound...');
        const key = Math.random() > 0.5 ? 'headshot1' : 'headshot2';
        this.play(key, { volume: 1.0 });
    }

    playLowHealth(hpPercent) {
        // Prevent spamming? Handled by Game.js or just trigger on threshold cross?
        // Assuming caller handles trigger logic
        if (hpPercent < 20) {
            this.play('imHit', { volume: 1.0 });
        } else if (hpPercent < 50) {
            this.play('youShotMe', { volume: 0.9 });
        }
    }

    playSteps(isMoving) {
        if (isMoving) {
            if (!this.stepLoop) {
                this.stepLoop = this.play('steps', { loop: true, volume: 0.4 });
            }
        } else {
            if (this.stepLoop) {
                try {
                    this.stepLoop.stop();
                } catch (e) { /* ignore already stopped */ }
                this.stepLoop = null;
            }
        }
    }

    playReload() {
        // If already playing a reload sound, don't start another one
        if (this.reloadSource) {
            // Check if it's still playing (sources don't have a reliable "isPlaying" but we can check state if we use a different approach, 
            // for now we'll just use a timeout or assume it finishes in ~1.5s as per Game.js reload logic)
            return;
        }

        const rand = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        this.reloadSource = this.play(`reload${rand}`, { volume: 0.6 });

        if (this.reloadSource) {
            this.reloadSource.onended = () => {
                this.reloadSource = null;
            };
            // Fallback: clear after 2 seconds if onended doesn't fire for some reason
            setTimeout(() => { this.reloadSource = null; }, 2000);
        }
    }

    playDeathSound() {
        this.play('youShotMe', { volume: 1.0 });
    }

    playDash() {
        const rand = Math.floor(Math.random() * 2) + 1; // 1 or 2
        this.play(`dash${rand}`, { volume: 0.7, varyPitch: true });
    }

    playShoot(weaponType) {
        // Currently ignoring weapon type as we only have Pyoom, but kept arg for future
        // Can map weapon types to different sounds later
        this.play('shoot', { volume: 0.5, varyPitch: true });
    }

    playTheme() {
        if (this.themeSource) return;
        this.themeSource = this.play('theme', { loop: false, volume: 0.3 });

        if (this.themeSource) {
            this.themeSource.onended = () => {
                this.themeSource = null;
                this.playBackgroundMusic();
            };
        }
    }

    playBackgroundMusic() {
        if (this.backgroundSource) return;

        // Start background loop at 25% volume
        const targetVolume = 0.25;
        this.backgroundSource = this.play('background', { loop: true, volume: targetVolume });
    }

    playAirborne(isAirborne) {
        if (isAirborne) {
            if (!this.airborneLoop) {
                console.log('[SoundManager] Starting airborne loop (wind)');
                this.airborneLoop = this.play('jump', { loop: true, volume: 0.6 });
            }
        } else {
            if (this.airborneLoop) {
                console.log('[SoundManager] Stopping airborne loop');
                try {
                    this.airborneLoop.stop();
                } catch (e) {
                    console.warn('[SoundManager] Error stopping airborne loop:', e);
                }
                this.airborneLoop = null;
            }
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.playSteps(false);
            this.playAirborne(false);
            if (this.backgroundSource) {
                try { this.backgroundSource.stop(); } catch (e) { }
                this.backgroundSource = null;
            }
        }
        return this.enabled;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
}

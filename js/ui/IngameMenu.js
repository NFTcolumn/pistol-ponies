// In-Game Menu (ESC Pause Menu) - Standalone Module
// Provides pause menu with player stats, wallet status, save/load, and quit functionality

export class IngameMenu {
    constructor() {
        this.visible = false;
        this.container = document.getElementById('ingameMenu');

        // Callbacks for game actions
        this.onSaveGame = null;
        this.onLoadGame = null;
        this.onQuitGame = null;
        this.onResumeGame = null;
    }

    /**
     * Initialize event listeners for menu buttons
     */
    setupEvents(callbacks) {
        this.onSaveGame = callbacks.onSaveGame || null;
        this.onLoadGame = callbacks.onLoadGame || null;
        this.onQuitGame = callbacks.onQuitGame || null;
        this.onResumeGame = callbacks.onResumeGame || null;

        // Resume button
        const resumeBtn = document.getElementById('resumeBtn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                if (this.onResumeGame) this.onResumeGame();
            });
        }

        // Save button
        const saveBtn = document.getElementById('saveGameBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (this.onSaveGame) {
                    this.setTxStatus('pending', 'Saving to blockchain...');
                    try {
                        await this.onSaveGame();
                        this.setTxStatus('success', 'Game saved successfully!');
                    } catch (error) {
                        this.setTxStatus('error', error.message || 'Save failed');
                    }
                }
            });
        }

        // Load button
        const loadBtn = document.getElementById('loadGameBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', async () => {
                if (this.onLoadGame) {
                    this.setTxStatus('pending', 'Loading from blockchain...');
                    try {
                        await this.onLoadGame();
                        this.setTxStatus('success', 'Game loaded!');
                    } catch (error) {
                        this.setTxStatus('error', error.message || 'Load failed');
                    }
                }
            });
        }

        // Quit button
        const quitBtn = document.getElementById('quitGameBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                if (this.onQuitGame) this.onQuitGame();
            });
        }
    }

    /**
     * Show the in-game menu
     */
    show(playerData = null, walletConnected = false, walletAddress = '') {
        this.visible = true;

        if (this.container) {
            this.container.style.display = 'flex';
        }

        // Update wallet status
        this.updateWalletStatus(walletConnected, walletAddress);

        // Update player stats
        if (playerData) {
            this.updateStats(playerData);
        }

        // Reset transaction status
        this.setTxStatus('', '');
    }

    /**
     * Hide the in-game menu
     */
    hide() {
        this.visible = false;

        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Toggle the menu visibility
     * @returns {boolean} - true if menu was opened, false if closed
     */
    toggle(playerData = null, walletConnected = false, walletAddress = '') {
        if (this.visible) {
            this.hide();
            return false;
        } else {
            this.show(playerData, walletConnected, walletAddress);
            return true;
        }
    }

    /**
     * Check if menu is currently visible
     */
    isVisible() {
        return this.visible;
    }

    /**
     * Update the wallet status display
     */
    updateWalletStatus(connected, address) {
        const walletDot = document.getElementById('menuWalletDot');
        const walletStatus = document.getElementById('menuWalletStatus');

        if (walletDot && walletStatus) {
            if (connected) {
                walletDot.classList.add('connected');
                walletStatus.textContent = address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : 'Connected';
            } else {
                walletDot.classList.remove('connected');
                walletStatus.textContent = 'Wallet not connected';
            }
        }
    }

    /**
     * Update player stats display
     */
    updateStats(playerData) {
        const kills = document.getElementById('menuKills');
        const level = document.getElementById('menuLevel');
        const deaths = document.getElementById('menuDeaths');

        if (kills) kills.textContent = playerData.kills || 0;
        if (level) level.textContent = playerData.level || 1;
        if (deaths) deaths.textContent = playerData.deaths || 0;

        // Update skill stats if provided
        if (playerData.stats) {
            const speed = document.getElementById('menuSpeed');
            const health = document.getElementById('menuHealth');
            const ammo = document.getElementById('menuAmmo');
            const jump = document.getElementById('menuJump');
            const dash = document.getElementById('menuDash');
            const aim = document.getElementById('menuAim');
            const skillPoints = document.getElementById('menuSkillPoints');

            if (speed) speed.textContent = playerData.stats.speed || 0;
            if (health) health.textContent = playerData.stats.health || 0;
            if (ammo) ammo.textContent = playerData.stats.ammo || 0;
            if (jump) jump.textContent = playerData.stats.jump || 0;
            if (dash) dash.textContent = playerData.stats.dash || 0;
            if (aim) aim.textContent = playerData.stats.aim || 0;
            if (skillPoints) skillPoints.textContent = playerData.stats.skillPoints || playerData.skillPoints || 0;
        }

        // Update name if provided
        if (playerData.name) {
            const nameDisplay = document.getElementById('menuPlayerName');
            if (nameDisplay) nameDisplay.textContent = playerData.name;
        }
    }

    /**
     * Set transaction status message
     * @param {string} status - 'pending', 'success', 'error', or '' to hide
     * @param {string} message - Status message to display
     */
    setTxStatus(status, message) {
        const txStatus = document.getElementById('txStatus');
        if (!txStatus) return;

        txStatus.className = 'tx-status';

        if (!status) {
            txStatus.style.display = 'none';
            return;
        }

        txStatus.classList.add(status);
        txStatus.textContent = message;
        txStatus.style.display = 'block';
    }
}

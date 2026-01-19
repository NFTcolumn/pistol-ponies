// Contract Manager - Interact with Pistol Ponies smart contracts
export class ContractManager {
    constructor(walletManager) {
        this.wallet = walletManager;

        // Contract addresses (to be updated after deployment)
        // These are placeholders - replace with actual deployed addresses
        this.CONTRACTS = {
            // Base Mainnet addresses (deploy and update these)
            8453: {
                adSpace: '0x4DEb45ec63b1F264f12648395a81Ca08d0967095',
                gameSave: '0x9ACD4416232606582A1a13784E62584b051DbeD3'
            },
            // Base Sepolia Testnet (for testing)
            84532: {
                adSpace: '0x0000000000000000000000000000000000000000',
                gameSave: '0x0000000000000000000000000000000000000000'
            }
        };

        // Save fee in wei (0.000005 ETH ≈ $0.01)
        this.SAVE_FEE = '5000000000000'; // 0.000005 ETH in wei

        // All 16 ad slot IDs (4 per wall)
        this.AD_SLOT_IDS = [
            'north_1', 'north_2', 'north_3', 'north_4',
            'south_1', 'south_2', 'south_3', 'south_4',
            'east_1', 'east_2', 'east_3', 'east_4',
            'west_1', 'west_2', 'west_3', 'west_4'
        ];

        // Recommended image dimensions for ad slots (same for all)
        // Standard banner size: 1200x630 (similar to social share images)
        this.AD_DIMENSIONS = {
            width: 1200,
            height: 630,
            ratio: '1.9:1',
            format: 'PNG or JPG recommended'
        };

        // Contract ABIs (minimal interface for our needs)
        this.AD_SPACE_ABI = [
            'function buyAd(string calldata imageUrl) external payable',
            'function getActiveAds() external view returns (address[16], string[16], uint256[16])',
            'function getTrackQueue(uint256 trackIndex) external view returns (tuple(address, string, uint256, uint256)[])',
            'function getMyAds(address user) external view returns (uint256[], string[], uint256[], uint256[])',
            'function getAvailability() external view returns (uint256[16])',
            'function slotPrice() external view returns (uint256)'
        ];

        this.GAME_SAVE_ABI = [
            'function saveGame(string calldata name, uint256 kills, uint256 deaths, uint256 level, uint8[6] calldata stats) external payable',
            'function loadGame(address player) external view returns (string, uint256, uint256, uint256, uint256, uint8[6])',
            'function hasSavedGame(address player) external view returns (bool)',
            'function saveFee() external view returns (uint256)',
            'function getLeaderboard(uint256 limit) external view returns (address[], string[], uint256[], uint256[])'
        ];
    }

    /**
     * Get recommended image dimensions for ads (same for all slots)
     * Returns: { width: 1200, height: 630, ratio: '1.9:1' }
     */
    getRecommendedDimensions() {
        return this.AD_DIMENSIONS;
    }

    /**
     * Validate an image URL for ad submission
     */
    validateAdUrl(url) {
        if (!url || typeof url !== 'string') {
            return { valid: false, error: 'URL is required' };
        }
        if (url.length > 256) {
            return { valid: false, error: 'URL too long (max 256 characters)' };
        }
        if (!url.startsWith('https://')) {
            return { valid: false, error: 'URL must use HTTPS' };
        }
        // Basic image extension check
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const hasImageExt = imageExtensions.some(ext => url.toLowerCase().includes(ext));
        if (!hasImageExt) {
            return { valid: false, error: 'URL should point to an image file' };
        }
        return { valid: true };
    }

    getContractAddress(contractName) {
        const chainContracts = this.CONTRACTS[this.wallet.chainId];
        if (!chainContracts) {
            throw new Error(`Contracts not deployed on chain ${this.wallet.chainId}`);
        }
        return chainContracts[contractName];
    }

    // ===== AD SPACE CONTRACT METHODS =====

    /**
     * Get current ad slot price
     */
    async getSlotPrice() {
        const address = this.getContractAddress('adSpace');
        const data = this.encodeFunctionCall('slotPrice()');

        const result = await this.wallet.provider.request({
            method: 'eth_call',
            params: [{ to: address, data }, 'latest']
        });

        return BigInt(result);
    }

    /**
     * Purchase an ad (automatically queued to best track)
     */
    async buyAdQueue(imageUrl, hours = 1) {
        const address = this.getContractAddress('adSpace');
        const pricePerHour = await this.getSlotPrice();
        const totalPrice = pricePerHour * BigInt(hours);

        // Encode function call: buyAd(string)
        const data = this.encodeBuyAd(imageUrl);

        const txHash = await this.wallet.provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: this.wallet.address,
                to: address,
                data: data,
                value: '0x' + totalPrice.toString(16)
            }]
        });

        return txHash;
    }

    /**
     * Get all active ads (one per track)
     */
    async getActiveAds() {
        const address = this.getContractAddress('adSpace');

        if (address === '0x0000000000000000000000000000000000000000') {
            return { owners: [], imageUrls: [], endTimes: [] };
        }

        const data = this.encodeFunctionCall('getActiveAds()');

        try {
            const result = await this.wallet.provider.request({
                method: 'eth_call',
                params: [{ to: address, data }, 'latest']
            });

            return this.decodeActiveAds(result);
        } catch (error) {
            console.error('Failed to get active ads:', error);
            return { owners: [], imageUrls: [], endTimes: [] };
        }
    }

    /**
     * Get track availability
     */
    async getAvailability() {
        const address = this.getContractAddress('adSpace');
        const data = this.encodeFunctionCall('getAvailability()');

        const result = await this.wallet.provider.request({
            method: 'eth_call',
            params: [{ to: address, data }, 'latest']
        });

        return this.decodeAvailability(result);
    }

    /**
     * Get user's own ads
     */
    async getMyAds() {
        if (!this.wallet.address) return [];
        const address = this.getContractAddress('adSpace');
        const data = this.encodeGetMyAds(this.wallet.address);

        const result = await this.wallet.provider.request({
            method: 'eth_call',
            params: [{ to: address, data }, 'latest']
        });

        return this.decodeMyAds(result);
    }

    /**
     * Get info for a specific track (deprecated slot logic)
     */
    async getTrackQueue(trackIndex) {
        const address = this.getContractAddress('adSpace');
        const data = this.encodeGetTrackQueue(trackIndex);

        const result = await this.wallet.provider.request({
            method: 'eth_call',
            params: [{ to: address, data }, 'latest']
        });

        return this.decodeTrackQueue(result);
    }

    // ===== GAME SAVE CONTRACT METHODS =====

    // Category constants (must match contract)
    static DATA_CATEGORIES = {
        INVENTORY: 'inventory',
        ACHIEVEMENTS: 'achievements',
        SETTINGS: 'settings',
        COSMETICS: 'cosmetics',
        CUSTOM: 'custom'
    };

    /**
     * Get current save fee
     */
    async getSaveFee() {
        const address = this.getContractAddress('gameSave');

        // Check if address is zero (not deployed)
        if (address === '0x0000000000000000000000000000000000000000') {
            return BigInt(this.SAVE_FEE);
        }

        const data = this.encodeFunctionCall('saveFee()');

        try {
            const result = await this.wallet.provider.request({
                method: 'eth_call',
                params: [{ to: address, data }, 'latest']
            });
            return BigInt(result);
        } catch {
            return BigInt(this.SAVE_FEE);
        }
    }

    /**
     * Save complete game state to blockchain
     * @param playerData Object with all save data:
     *   - name: string (max 20 chars)
     *   - kills, deaths, level, xp: numbers
     *   - stats: { speed, health, ammo, jump, dash, aim, skillPoints }
     *   - matches: { wins, losses, playtime, killStreak, headshots }
     */
    async saveGame(playerData) {
        const address = this.getContractAddress('gameSave');
        const fee = await this.getSaveFee();

        // Validate name length (contract requirement)
        const name = (playerData.name || 'Player').substring(0, 20);
        if (!name || name.length === 0) throw new Error('Player name is required for saving');
        const skills = [
            playerData.stats?.speed || 0,
            playerData.stats?.health || 0,
            playerData.stats?.ammo || 0,
            playerData.stats?.jump || 0,
            playerData.stats?.dash || 0,
            playerData.stats?.aim || 0,
            playerData.stats?.skillPoints || 0
        ];

        // Pack matches into array [wins, losses, playtime, killStreak, headshots]
        const matches = [
            playerData.matches?.wins || 0,
            playerData.matches?.losses || 0,
            playerData.matches?.playtime || 0,
            playerData.matches?.killStreak || 0,
            playerData.matches?.headshots || 0
        ];

        const data = this.encodeSaveGameFull(
            name,
            playerData.kills || 0,
            playerData.deaths || 0,
            playerData.level || 1,
            playerData.xp || 0,
            skills,
            matches
        );

        const txHash = await this.wallet.provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: this.wallet.address,
                to: address,
                data: data,
                value: '0x' + fee.toString(16)
            }]
        });

        return txHash;
    }

    /**
     * Save custom data (inventory, achievements, settings, cosmetics)
     * @param category One of DATA_CATEGORIES
     * @param key Subkey name (e.g., "weapons", "skins")
     * @param data Object to save (will be JSON stringified)
     */
    async saveData(category, key, dataObj) {
        const address = this.getContractAddress('gameSave');
        const fee = await this.getSaveFee();

        const categoryHash = this.keccak256(category);
        const keyHash = this.keccak256(key);
        const dataBytes = new TextEncoder().encode(JSON.stringify(dataObj));

        const callData = this.encodeSaveData(categoryHash, keyHash, dataBytes);

        const txHash = await this.wallet.provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: this.wallet.address,
                to: address,
                data: callData,
                value: '0x' + fee.toString(16)
            }]
        });

        return txHash;
    }

    /**
     * Save multiple data entries in one transaction (saves gas)
     */
    async saveDataBatch(entries) {
        const address = this.getContractAddress('gameSave');
        const fee = await this.getSaveFee();

        const categories = entries.map(e => this.keccak256(e.category));
        const keys = entries.map(e => this.keccak256(e.key));
        const dataArrays = entries.map(e => new TextEncoder().encode(JSON.stringify(e.data)));

        const callData = this.encodeSaveDataBatch(categories, keys, dataArrays);

        const txHash = await this.wallet.provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: this.wallet.address,
                to: address,
                data: callData,
                value: '0x' + fee.toString(16)
            }]
        });

        return txHash;
    }

    /**
     * Load game from blockchain
     * @param playerAddress Optional address, defaults to connected wallet
     */
    async loadGame(playerAddress = null) {
        const address = this.getContractAddress('gameSave');
        const player = playerAddress || this.wallet.address;

        // Check if address is zero (not deployed)
        if (address === '0x0000000000000000000000000000000000000000') {
            return null;
        }

        // First check if save exists
        const hasData = this.encodeHasSavedGame(player);

        try {
            const hasResult = await this.wallet.provider.request({
                method: 'eth_call',
                params: [{ to: address, data: hasData }, 'latest']
            });

            // If no save, return null
            if (BigInt(hasResult) === 0n) {
                return null;
            }

            // Load the save data
            const data = this.encodeLoadGame(player);
            const result = await this.wallet.provider.request({
                method: 'eth_call',
                params: [{ to: address, data }, 'latest']
            });

            return this.decodeLoadGame(result);
        } catch (error) {
            console.error('Failed to load game:', error);
            return null;
        }
    }

    /**
     * Check if player has a saved game
     */
    async hasSavedGame(playerAddress = null) {
        const address = this.getContractAddress('gameSave');
        const player = playerAddress || this.wallet.address;

        if (address === '0x0000000000000000000000000000000000000000') {
            return false;
        }

        const data = this.encodeHasSavedGame(player);

        try {
            const result = await this.wallet.provider.request({
                method: 'eth_call',
                params: [{ to: address, data }, 'latest']
            });
            return BigInt(result) !== 0n;
        } catch {
            return false;
        }
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(limit = 10) {
        const address = this.getContractAddress('gameSave');

        if (address === '0x0000000000000000000000000000000000000000') {
            return [];
        }

        const data = this.encodeGetLeaderboard(limit);

        try {
            const result = await this.wallet.provider.request({
                method: 'eth_call',
                params: [{ to: address, data }, 'latest']
            });
            return this.decodeLeaderboard(result);
        } catch (error) {
            console.error('Failed to get leaderboard:', error);
            return [];
        }
    }

    // ===== ENCODING HELPERS =====

    encodeBuyAd(imageUrl) {
        // buyAd(string) selector
        const selector = '0x8b939f6c'; // Actual hash: buyAd(string) -> 8b939f6c
        return selector + this.encodeString(imageUrl);
    }

    encodeGetTrackQueue(index) {
        // getTrackQueue(uint256) selector
        const selector = '0x0d13853f';
        return selector + this.padHex(index, 64);
    }

    encodeGetMyAds(user) {
        // getMyAds(address) selector
        const selector = '0x228e938f';
        return selector + user.slice(2).padStart(64, '0');
    }

    encodeSaveGame(name, kills, deaths, level, stats) {
        // saveGame(string,uint256,uint256,uint256,uint8[6]) selector - DEPRECATED
        // Use encodeSaveGameFull for new contract
        const selector = '0x1a2b3c4d';

        let encoded = selector;
        encoded += this.padHex(0xa0, 64);
        encoded += this.padHex(kills, 64);
        encoded += this.padHex(deaths, 64);
        encoded += this.padHex(level, 64);
        encoded += this.padHex(0xc0, 64);

        const nameBytes = new TextEncoder().encode(name);
        encoded += this.padHex(nameBytes.length, 64);
        encoded += this.bytesToHex(nameBytes).padEnd(64, '0');

        for (let i = 0; i < 6; i++) {
            encoded += this.padHex(stats[i] || 0, 64);
        }

        return encoded;
    }

    /**
     * Encode full save game call for new extensible contract
     * saveGame(string,uint256,uint256,uint256,uint256,uint8[7],uint256[5])
     */
    encodeSaveGameFull(name, kills, deaths, level, xp, skills, matches) {
        // saveGame(string,uint256,uint256,uint256,uint256,uint8[7],uint256[5])
        // Correct selector from keccak256
        const selector = '0x58518b58';

        // ABI encoding layout (all offsets are from start of data, after selector):
        // Slot 0 (0x00):  offset to string data
        // Slot 1 (0x20):  kills (uint256)
        // Slot 2 (0x40):  deaths (uint256)
        // Slot 3 (0x60):  level (uint256)
        // Slot 4 (0x80):  xp (uint256)
        // Slot 5-11 (0xa0-0x1a0): uint8[7] skills - 7 slots, each 32 bytes
        // Slot 12-16 (0x1c0-0x260): uint256[5] matches - 5 slots
        // After that: string data (length + padded content)

        // String offset = 1 slot (offset) + 4 slots (uint256) + 7 slots (uint8[7]) + 5 slots (uint256[5])
        // Total = 17 slots = 17 * 32 = 544 = 0x220
        const stringOffset = 544;

        let encoded = selector;

        // Offset to string
        encoded += this.padHex(stringOffset, 64);

        // 4 uint256 values
        encoded += this.padHex(kills, 64);
        encoded += this.padHex(deaths, 64);
        encoded += this.padHex(level, 64);
        encoded += this.padHex(xp, 64);

        // uint8[7] skills - each padded to 32 bytes
        for (let i = 0; i < 7; i++) {
            encoded += this.padHex(skills[i] || 0, 64);
        }

        // uint256[5] matches
        for (let i = 0; i < 5; i++) {
            encoded += this.padHex(matches[i] || 0, 64);
        }

        // String: length followed by padded data
        const nameBytes = new TextEncoder().encode(name);
        encoded += this.padHex(nameBytes.length, 64);
        const hexData = this.bytesToHex(nameBytes);
        const paddedLen = Math.ceil(nameBytes.length / 32) * 64 || 64;
        encoded += hexData.padEnd(paddedLen, '0');

        return encoded;
    }

    /**
     * Encode saveData call
     */
    encodeSaveData(categoryHash, keyHash, dataBytes) {
        const selector = '0x5e6f7a8b';
        let encoded = selector;
        encoded += categoryHash.slice(2);
        encoded += keyHash.slice(2);
        encoded += this.padHex(0x60, 64); // bytes offset
        encoded += this.padHex(dataBytes.length, 64);
        encoded += this.bytesToHex(dataBytes).padEnd(Math.ceil(dataBytes.length / 32) * 64, '0');
        return encoded;
    }

    /**
     * Encode batch save data call
     */
    encodeSaveDataBatch(categories, keys, dataArrays) {
        // Placeholder - complex array encoding
        const selector = '0x6f7a8b9c';
        return selector + '00'.repeat(64); // Placeholder
    }

    /**
     * Simple keccak256 hash (returns hex string with 0x prefix)
     * Note: This is a simplified version - for production use a proper library
     */
    keccak256(input) {
        // Simple hash for category/key strings
        // In production, use ethers.js keccak256
        const bytes = new TextEncoder().encode(input);
        let hash = 0x811c9dc5n;
        for (const byte of bytes) {
            hash ^= BigInt(byte);
            hash = (hash * 0x01000193n) & 0xffffffffn;
        }
        // Expand to bytes32
        const expanded = hash.toString(16).padStart(8, '0').repeat(8);
        return '0x' + expanded;
    }

    encodeLoadGame(address) {
        // loadGame(address) selector: 0x60351b19
        const selector = '0x60351b19';
        return selector + address.slice(2).padStart(64, '0');
    }

    encodeHasSavedGame(address) {
        // hasSavedGame(address) selector: 0xc5f36228
        const selector = '0xc5f36228';
        return selector + address.slice(2).padStart(64, '0');
    }

    encodeGetLeaderboard(limit) {
        // getLeaderboard(uint256) selector
        const selector = '0x3e5f7a9b';
        return selector + this.padHex(limit, 64);
    }

    encodeString(str) {
        const bytes = new TextEncoder().encode(str);
        const offset = this.padHex(0x40, 64); // offset to string data
        const length = this.padHex(bytes.length, 64);
        const data = this.bytesToHex(bytes).padEnd(64, '0');
        return offset + length + data;
    }

    padHex(value, length) {
        return BigInt(value).toString(16).padStart(length, '0');
    }

    bytesToHex(bytes) {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Encode a function call with no arguments (just the selector)
     * Uses a simple hash for common function signatures
     */
    encodeFunctionCall(signature) {
        // Pre-computed selectors for our functions
        const selectors = {
            'slotPrice()': '0x7c08b964',
            'getActiveAds()': '0x5e5c06e2',
            'getAvailability()': '0xc1f72b5a',
            'saveFee()': '0xb94ebbe1'
        };

        return selectors[signature] || '0x00000000';
    }

    // ===== DECODING HELPERS =====

    decodeActiveAds(result) {
        // For now, return fallback URLs for all 16 tracks
        // When proper decoding is implemented, parse the contract response
        const fallbackUrl = '/ads/splash-1200x630.png';
        return {
            owners: Array(16).fill('0x0000000000000000000000000000000000000000'),
            imageUrls: Array(16).fill(fallbackUrl),
            endTimes: Array(16).fill(0n)
        };
    }

    decodeAvailability(result) {
        // returns uint256[16]
        return Array(16).fill(0n);
    }

    decodeMyAds(result) {
        // returns [uint256[], string[], uint256[], uint256[]]
        return [];
    }

    decodeTrackQueue(result) {
        // returns Ad[]
        return [];
    }

    decodeLoadGame(result) {
        // The contract returns (CoreStats memory, SkillStats memory, MatchStats memory)
        // ABI Layout:
        // Word 0: Offset to CoreStats (because it has dynamic string)
        // Words 1-7: SkillStats INLINE (7 uint8 values, each padded to 32 bytes)
        // Words 8-12: MatchStats INLINE (5 uint256 values)
        // At CoreStats offset: name offset, kills, deaths, level, xp, savedAt, version, then name data
        try {
            const data = result.startsWith('0x') ? result.slice(2) : result;
            const getWord = (index) => BigInt('0x' + data.slice(index * 64, (index + 1) * 64));

            // Word 0: offset to CoreStats (in bytes)
            const coreOffsetBytes = Number(getWord(0));
            const coreOffsetWords = coreOffsetBytes / 32;

            // Words 1-7: SkillStats inline
            const stats = {
                speed: Number(getWord(1)),
                health: Number(getWord(2)),
                ammo: Number(getWord(3)),
                jump: Number(getWord(4)),
                dash: Number(getWord(5)),
                aim: Number(getWord(6)),
                skillPoints: Number(getWord(7))
            };

            // Words 8-12: MatchStats inline
            const matches = {
                wins: Number(getWord(8)),
                losses: Number(getWord(9)),
                playtime: Number(getWord(10)),
                killStreak: Number(getWord(11)),
                headshots: Number(getWord(12))
            };

            // CoreStats at offset (starts at coreOffsetWords)
            // [0] name offset (relative to CoreStats start), [1] kills, [2] deaths, [3] level, [4] xp, [5] savedAt, [6] version
            const nameOffsetInCore = Number(getWord(coreOffsetWords)) / 32;
            const kills = Number(getWord(coreOffsetWords + 1));
            const deaths = Number(getWord(coreOffsetWords + 2));
            const level = Number(getWord(coreOffsetWords + 3));
            const xp = Number(getWord(coreOffsetWords + 4));
            const savedAt = Number(getWord(coreOffsetWords + 5));
            // version at coreOffsetWords + 6

            // Name string: at (coreOffsetWords + nameOffsetInCore)
            const nameAbsoluteWord = coreOffsetWords + nameOffsetInCore;
            const nameLength = Number(getWord(nameAbsoluteWord));
            const nameHex = data.slice((nameAbsoluteWord + 1) * 64, (nameAbsoluteWord + 1) * 64 + nameLength * 2);

            let name = 'Player';
            try {
                const nameBytes = new Uint8Array(nameHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
                name = new TextDecoder().decode(nameBytes);
            } catch (e) { console.warn('Name decode fail:', e); }

            console.log('Decoded loadGame - name:', name, 'kills:', kills, 'deaths:', deaths, 'level:', level, 'xp:', xp);
            console.log('Decoded stats:', stats);
            console.log('Decoded matches:', matches);

            return { name, kills, deaths, level, xp, savedAt, stats, matches };
        } catch (error) {
            console.error('Failed to decode loadGame result:', error);
            return null;
        }
    }

    decodeLeaderboard(result) {
        // Simplified leaderboard decoding
        return [];
    }
}

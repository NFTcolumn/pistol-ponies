// Wallet Manager - Multi-chain wallet connection with PONY token gating
export class WalletManager {
    constructor() {
        this.connected = false;
        this.address = null;
        this.chainId = null;
        this.provider = null;

        // PONY token contracts on each supported chain
        this.PONY_CONTRACTS = {
            // Base (Chain ID: 8453)
            8453: '0x6ab297799335E7b0f60d9e05439Df156cf694Ba7',
            // BNB Chain (Chain ID: 56)
            56: '0xde2f957BF8B9459e9E998b98789Af02920404ad8',
            // Polygon (Chain ID: 137)
            137: '0x78aeAAF529B318E74f4E1F988CC48B1997DA4beA',
            // Celo (Chain ID: 42220)
            42220: '0x000BE46901ea6f7ac2c1418D158f2f0A80992c07'
        };

        this.CHAIN_NAMES = {
            8453: 'Base',
            56: 'BNB Chain',
            137: 'Polygon',
            42220: 'Celo'
        };

        this.CHAIN_RPC = {
            8453: 'https://mainnet.base.org',
            56: 'https://bsc-dataseed.binance.org',
            137: 'https://polygon-rpc.com',
            42220: 'https://forno.celo.org'
        };

        // ERC20 ABI (only balanceOf needed)
        this.ERC20_ABI = [
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)'
        ];
    }

    async connect() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.address = accounts[0];
            this.chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
            this.connected = true;
            this.provider = window.ethereum;

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.address = accounts[0];
                    this.onAccountChange?.(this.address);
                }
            });

            // Listen for chain changes
            window.ethereum.on('chainChanged', (chainId) => {
                this.chainId = parseInt(chainId, 16);
                this.onChainChange?.(this.chainId);
            });

            return {
                address: this.address,
                chainId: this.chainId,
                chainName: this.CHAIN_NAMES[this.chainId] || 'Unknown'
            };
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        }
    }

    disconnect() {
        this.connected = false;
        this.address = null;
        this.chainId = null;
        this.provider = null;
    }

    async switchChain(chainId) {
        if (!this.provider) throw new Error('Not connected');

        try {
            await this.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x' + chainId.toString(16) }]
            });
            this.chainId = chainId;
            return true;
        } catch (error) {
            // Chain not added, try to add it
            if (error.code === 4902) {
                await this.addChain(chainId);
                return true;
            }
            throw error;
        }
    }

    async addChain(chainId) {
        const chainParams = {
            8453: {
                chainId: '0x2105',
                chainName: 'Base',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org']
            },
            56: {
                chainId: '0x38',
                chainName: 'BNB Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org'],
                blockExplorerUrls: ['https://bscscan.com']
            },
            137: {
                chainId: '0x89',
                chainName: 'Polygon',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com'],
                blockExplorerUrls: ['https://polygonscan.com']
            },
            42220: {
                chainId: '0xa4ec',
                chainName: 'Celo',
                nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
                rpcUrls: ['https://forno.celo.org'],
                blockExplorerUrls: ['https://celoscan.io']
            }
        };

        const params = chainParams[chainId];
        if (!params) throw new Error('Unsupported chain');

        await this.provider.request({
            method: 'wallet_addEthereumChain',
            params: [params]
        });
    }

    async checkPonyBalance() {
        if (!this.connected || !this.chainId) {
            throw new Error('Wallet not connected');
        }

        const contractAddress = this.PONY_CONTRACTS[this.chainId];
        if (!contractAddress) {
            throw new Error(`PONY token not available on chain ${this.chainId}`);
        }

        try {
            // Call balanceOf directly using eth_call
            const data = this.encodeBalanceOf(this.address);
            const result = await this.provider.request({
                method: 'eth_call',
                params: [{
                    to: contractAddress,
                    data: data
                }, 'latest']
            });

            // Parse result (uint256)
            const balance = BigInt(result);
            return balance;
        } catch (error) {
            console.error('Failed to check PONY balance:', error);
            throw error;
        }
    }

    encodeBalanceOf(address) {
        // balanceOf(address) function selector: 0x70a08231
        const selector = '0x70a08231';
        // Pad address to 32 bytes
        const paddedAddress = address.slice(2).padStart(64, '0');
        return selector + paddedAddress;
    }

    async isHolder(minBalance = 1n) {
        try {
            const balance = await this.checkPonyBalance();
            // Assuming 18 decimals, minBalance is in whole tokens
            const minBalanceWei = minBalance * (10n ** 18n);
            return balance >= minBalanceWei;
        } catch (error) {
            console.error('Error checking holder status:', error);
            return false;
        }
    }

    getShortAddress() {
        if (!this.address) return '';
        return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`;
    }

    getSupportedChains() {
        return Object.keys(this.CHAIN_NAMES).map(id => ({
            chainId: parseInt(id),
            name: this.CHAIN_NAMES[id]
        }));
    }
}

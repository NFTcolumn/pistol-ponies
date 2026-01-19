require("@nomicfoundation/hardhat-toolbox");
const { DEPLOYER_PRIVATE_KEY } = require("./wallet-config.cjs");

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
    solidity: "0.8.19",

    networks: {
        // Base Mainnet
        base: {
            url: "https://mainnet.base.org",
            accounts: [DEPLOYER_PRIVATE_KEY],
            chainId: 8453,
        },
        // Base Sepolia Testnet
        baseSepolia: {
            url: "https://sepolia.base.org",
            accounts: [DEPLOYER_PRIVATE_KEY],
            chainId: 84532,
        },
        // Local hardhat network
        hardhat: {
            chainId: 31337,
        }
    },

    // Basescan verification
    etherscan: {
        apiKey: {
            base: process.env.BASESCAN_API_KEY || "YOUR_BASESCAN_API_KEY"
        },
        customChains: [
            {
                network: "base",
                chainId: 8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org"
                }
            }
        ]
    },

    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};

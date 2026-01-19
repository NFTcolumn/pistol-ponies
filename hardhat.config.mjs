// Simple Hardhat ESM config for Pistol Ponies
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { DEPLOYER_PRIVATE_KEY } = require("./wallet-config.cjs");

/** @type {import('hardhat/config').HardhatUserConfig} */
export default {
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

    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};

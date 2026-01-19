// Update save fee on live contract using raw ethers
// Run: npx hardhat --config hardhat.config.mjs run scripts/update-fee.mjs --network base

import { ethers } from "ethers";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { DEPLOYER_PRIVATE_KEY } = require("../wallet-config.cjs");

// GameSave contract address on Base mainnet
const GAME_SAVE_ADDRESS = "0x9ACD4416232606582A1a13784E62584b051DbeD3";

// New fee: 0.000005 ETH = 5000000000000 wei (~1 cent)
const NEW_FEE = "5000000000000";

// Minimal ABI for the functions we need
const GAME_SAVE_ABI = [
    "function saveFee() view returns (uint256)",
    "function owner() view returns (address)",
    "function setSaveFee(uint256 newFee)"
];

async function main() {
    console.log("=== Update Save Fee on Base ===\n");

    // Connect to Base mainnet
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

    console.log("Connected to Base mainnet");
    console.log("Using account:", wallet.address);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Get contract instance
    const gameSave = new ethers.Contract(GAME_SAVE_ADDRESS, GAME_SAVE_ABI, wallet);

    console.log("\nContract:", GAME_SAVE_ADDRESS);

    // Check current fee
    const currentFee = await gameSave.saveFee();
    console.log("Current fee:", ethers.formatEther(currentFee), "ETH");

    // Check owner
    const owner = await gameSave.owner();
    console.log("Contract owner:", owner);

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.error("\n❌ ERROR: You are not the contract owner!");
        console.error("Owner is:", owner);
        console.error("You are:", wallet.address);
        process.exit(1);
    }

    console.log("\n✅ You are the owner. Proceeding...");
    console.log("New fee will be:", ethers.formatEther(NEW_FEE), "ETH");

    // Update the fee
    console.log("\nSending setSaveFee transaction...");
    const tx = await gameSave.setSaveFee(NEW_FEE);
    console.log("Transaction hash:", tx.hash);
    console.log("View on Basescan: https://basescan.org/tx/" + tx.hash);

    // Wait for confirmation
    console.log("\nWaiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Verify new fee
    const newFee = await gameSave.saveFee();
    console.log("\n✅ Fee updated successfully!");
    console.log("New fee:", ethers.formatEther(newFee), "ETH (~1¢)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });

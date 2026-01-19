// Update save fee on live contract
// Run: npx hardhat run scripts/update-fee.cjs --network base

const { ethers } = require("hardhat");

async function main() {
    // GameSave contract address on Base mainnet
    const GAME_SAVE_ADDRESS = "0x9ACD4416232606582A1a13784E62584b051DbeD3";

    // New fee: 0.000005 ETH = 5000000000000 wei (~1 cent)
    const NEW_FEE = "5000000000000";

    console.log("Updating save fee on contract:", GAME_SAVE_ADDRESS);
    console.log("New fee:", ethers.formatEther(NEW_FEE), "ETH");

    // Get deployer signer
    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    // Get contract instance
    const gameSave = await ethers.getContractAt("PistolPoniesGameSave", GAME_SAVE_ADDRESS);

    // Check current fee
    const currentFee = await gameSave.saveFee();
    console.log("Current fee:", ethers.formatEther(currentFee), "ETH");

    // Check owner
    const owner = await gameSave.owner();
    console.log("Contract owner:", owner);

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error("ERROR: You are not the contract owner!");
        console.error("Owner is:", owner);
        console.error("You are:", deployer.address);
        return;
    }

    // Update the fee
    console.log("\nSending setSaveFee transaction...");
    const tx = await gameSave.setSaveFee(NEW_FEE);
    console.log("Transaction hash:", tx.hash);

    // Wait for confirmation
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Confirmed in block:", receipt.blockNumber);

    // Verify new fee
    const newFee = await gameSave.saveFee();
    console.log("\n✅ Fee updated successfully!");
    console.log("New fee:", ethers.formatEther(newFee), "ETH");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

// Verify contracts on Basescan
// Run: npx hardhat run scripts/verify-contracts.cjs --network base
// 
// Prerequisites:
// 1. Get a Basescan API key from https://basescan.org/apis
// 2. Add to .env: BASESCAN_API_KEY=your_key_here
//
// You can also verify manually with:
// npx hardhat verify --network base CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2"

const hre = require("hardhat");

// Contract addresses on Base mainnet
const CONTRACTS = {
    gameSave: {
        address: "0x9ACD4416232606582A1a13784E62584b051DbeD3",
        constructorArgs: ["50000000000000"] // Initial save fee: 0.00005 ETH
    },
    adSpace: {
        address: "0x4DEb45ec63b1F264f12648395a81Ca08d0967095",
        constructorArgs: ["13890000000000"] // Slot price per hour
    }
};

async function verifyContract(name, address, constructorArgs) {
    console.log(`\nVerifying ${name} at ${address}...`);

    try {
        await hre.run("verify:verify", {
            address: address,
            constructorArguments: constructorArgs,
        });
        console.log(`✅ ${name} verified successfully!`);
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log(`ℹ️ ${name} is already verified`);
        } else {
            console.error(`❌ Failed to verify ${name}:`, error.message);
        }
    }
}

async function main() {
    console.log("=== Basescan Contract Verification ===");
    console.log("Network:", hre.network.name);

    if (!process.env.BASESCAN_API_KEY || process.env.BASESCAN_API_KEY === "YOUR_BASESCAN_API_KEY") {
        console.error("\n❌ ERROR: BASESCAN_API_KEY not set!");
        console.log("\nTo get an API key:");
        console.log("1. Go to https://basescan.org/apis");
        console.log("2. Create an account and generate an API key");
        console.log("3. Add to .env: BASESCAN_API_KEY=your_key_here");
        return;
    }

    // Verify GameSave
    await verifyContract(
        "PistolPoniesGameSave",
        CONTRACTS.gameSave.address,
        CONTRACTS.gameSave.constructorArgs
    );

    // Verify AdSpace
    await verifyContract(
        "PistolPoniesAdSpace",
        CONTRACTS.adSpace.address,
        CONTRACTS.adSpace.constructorArgs
    );

    console.log("\n=== Verification Complete ===");
    console.log("View on Basescan:");
    console.log(`GameSave: https://basescan.org/address/${CONTRACTS.gameSave.address}#code`);
    console.log(`AdSpace:  https://basescan.org/address/${CONTRACTS.adSpace.address}#code`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

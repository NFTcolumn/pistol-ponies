const hre = require("hardhat");
const { AD_SLOT_PRICE } = require("../wallet-config.cjs");

async function main() {
    console.log("Deploying PistolPoniesAdSpace...");

    const AdSpace = await hre.ethers.getContractFactory("PistolPoniesAdSpace");

    // Deploy with initial price from config
    const adSpace = await AdSpace.deploy(AD_SLOT_PRICE);

    await adSpace.waitForDeployment();

    const address = await adSpace.getAddress();
    console.log("PistolPoniesAdSpace deployed to:", address);
    console.log("Initial Slot Price:", AD_SLOT_PRICE, "wei per hour");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

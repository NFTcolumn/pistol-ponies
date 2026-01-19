const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { AD_SLOT_PRICE, DEPLOYER_PRIVATE_KEY } = require("../wallet-config.cjs");

async function main() {
    if (DEPLOYER_PRIVATE_KEY === '0x0000000000000000000000000000000000000000000000000000000000000001') {
        throw new Error("Please set your actual private key in wallet-config.cjs");
    }

    console.log("Starting standalone deployment...");

    // Connect to Base Mainnet
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

    console.log("Deploying with address:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    // Load artifact
    const artifactPath = path.join(__dirname, "../artifacts/contracts/PistolPoniesAdSpace.sol/PistolPoniesAdSpace.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("Deploying PistolPoniesAdSpace...");
    const contract = await factory.deploy(AD_SLOT_PRICE);

    console.log("Waiting for deployment... Hash:", contract.deploymentTransaction().hash);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("PistolPoniesAdSpace deployed to:", address);
    console.log("Initial Slot Price:", AD_SLOT_PRICE, "wei per hour");
}

main().catch(console.error);

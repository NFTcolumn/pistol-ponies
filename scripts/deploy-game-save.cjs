const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { SAVE_FEE, DEPLOYER_PRIVATE_KEY } = require("../wallet-config.cjs");

async function main() {
    if (DEPLOYER_PRIVATE_KEY === '0x0000000000000000000000000000000000000000000000000000000000000001') {
        throw new Error("Please set your actual private key in wallet-config.cjs");
    }

    console.log("Starting Game Save contract deployment...");

    // Connect to Base Mainnet
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

    console.log("Deploying with address:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    // Load artifact
    const artifactPath = path.join(__dirname, "../artifacts/contracts/PistolPoniesGameSave.sol/PistolPoniesGameSave.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("Deploying PistolPoniesGameSave...");
    const contract = await factory.deploy(SAVE_FEE);

    console.log("Waiting for deployment... Hash:", contract.deploymentTransaction().hash);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("PistolPoniesGameSave deployed to:", address);
    console.log("Initial Save Fee:", SAVE_FEE, "wei");
}

main().catch(console.error);

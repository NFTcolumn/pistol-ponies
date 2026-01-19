// Verify contracts on Basescan using Etherscan v2 API
// Run: node scripts/verify-contracts.mjs
//
// Etherscan v2 API endpoint: https://api.etherscan.io/v2/api?chainid=8453
// Docs: https://docs.etherscan.io/etherscan-v2

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Etherscan v2 API - chainid in query string
const BASE_CHAIN_ID = 8453;
const ETHERSCAN_V2_API = `https://api.etherscan.io/v2/api?chainid=${BASE_CHAIN_ID}`;

// Contract addresses on Base mainnet
const CONTRACTS = {
    PistolPoniesGameSave: {
        address: "0x9ACD4416232606582A1a13784E62584b051DbeD3",
        constructorArgs: "50000000000000" // Initial save fee: 0.00005 ETH (uint256)
    },
    PistolPoniesAdSpace: {
        address: "0x4DEb45ec63b1F264f12648395a81Ca08d0967095",
        constructorArgs: "13890000000000" // Slot price per hour (uint256)
    }
};

async function getContractSource(contractName) {
    const solPath = path.join(__dirname, "..", "contracts", `${contractName}.sol`);
    if (!fs.existsSync(solPath)) {
        throw new Error(`Contract file not found: ${solPath}`);
    }
    return fs.readFileSync(solPath, "utf8");
}

// Encode constructor arguments for uint256
function encodeConstructorArgs(value) {
    // Pad uint256 to 32 bytes (64 hex chars)
    return BigInt(value).toString(16).padStart(64, "0");
}

async function verifyContract(contractName, address, constructorArgsValue) {
    const apiKey = process.env.BASESCAN_API_KEY;
    if (!apiKey) {
        throw new Error("BASESCAN_API_KEY not set in .env");
    }

    console.log(`\n📋 Verifying ${contractName} at ${address}...`);

    // Read contract source
    const sourceCode = await getContractSource(contractName);

    // Encode constructor args
    const encodedArgs = encodeConstructorArgs(constructorArgsValue);
    console.log(`   Constructor args (encoded): 0x${encodedArgs}`);

    // Prepare verification request for Etherscan v2
    const params = new URLSearchParams({
        module: "contract",
        action: "verifysourcecode",
        apikey: apiKey,
        contractaddress: address,
        sourceCode: sourceCode,
        codeformat: "solidity-single-file",
        contractname: contractName,
        compilerversion: "v0.8.19+commit.7dd6d404",
        optimizationUsed: "0",
        runs: "200",
        constructorArguements: encodedArgs, // Note: Etherscan API has typo "Arguements"
        evmversion: "paris",
        licenseType: "3" // MIT
    });

    console.log("   Submitting to Etherscan v2 API...");

    try {
        const response = await fetch(ETHERSCAN_V2_API, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString()
        });

        const data = await response.json();
        console.log("   API Response:", JSON.stringify(data, null, 2));

        if (data.status === "1") {
            const guid = data.result;
            console.log(`   ✅ Submitted! GUID: ${guid}`);
            console.log("   Checking verification status...");

            // Poll for verification result
            await checkVerificationStatus(guid, apiKey);
        } else if (data.result?.includes("Already Verified")) {
            console.log(`   ℹ️ ${contractName} is already verified`);
        } else {
            console.log(`   ❌ Failed: ${data.result || data.message}`);
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
    }
}

async function checkVerificationStatus(guid, apiKey) {
    const maxAttempts = 10;
    const delayMs = 5000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, delayMs));

        const checkUrl = `${ETHERSCAN_V2_API}&module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`;

        const response = await fetch(checkUrl);
        const data = await response.json();

        console.log(`   Status check ${i + 1}/${maxAttempts}: ${data.result}`);

        if (data.result === "Pass - Verified") {
            console.log("   ✅ Verification successful!");
            return true;
        } else if (!data.result?.includes("Pending")) {
            console.log(`   ⚠️ Verification result: ${data.result}`);
            return false;
        }
    }

    console.log("   ⏳ Verification still pending. Check Basescan later.");
    return false;
}

async function main() {
    console.log("=== Basescan Contract Verification (Etherscan v2 API) ===");
    console.log("Chain: Base Mainnet (8453)");
    console.log(`API: ${ETHERSCAN_V2_API}`);

    if (!process.env.BASESCAN_API_KEY) {
        console.error("\n❌ ERROR: BASESCAN_API_KEY not set in .env!");
        console.log("Get one from: https://basescan.org/apis");
        process.exit(1);
    }

    // Verify each contract
    for (const [name, info] of Object.entries(CONTRACTS)) {
        await verifyContract(name, info.address, info.constructorArgs);
    }

    console.log("\n=== Verification Complete ===");
    console.log("View on Basescan:");
    console.log(`GameSave: https://basescan.org/address/${CONTRACTS.PistolPoniesGameSave.address}#code`);
    console.log(`AdSpace:  https://basescan.org/address/${CONTRACTS.PistolPoniesAdSpace.address}#code`);
}

main().catch(console.error);

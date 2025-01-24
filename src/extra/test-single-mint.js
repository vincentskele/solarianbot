const { Connection, PublicKey } = require('@solana/web3.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Define the Metaplex Metadata Program ID
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Solana RPC endpoint
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL);

// Load the first mint address from ../data/mintlist.json
const mintListPath = path.resolve(__dirname, '../data/mintlist.json');
const mintAddresses = JSON.parse(fs.readFileSync(mintListPath, 'utf-8'));
const firstMint = mintAddresses[0]; // Only the first mint

// Path to test-single-attribute.json
const testOutputPath = path.resolve(__dirname, '../data/test-single-attribute.json');

// Utility: Delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry wrapper with exponential backoff
const retryWithBackoff = async (fn, retries = 5, delayMs = 500) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn(); // Attempt the function
        } catch (error) {
            if (i < retries - 1) {
                console.log(`Retrying after ${delayMs}ms...`);
                await delay(delayMs);
                delayMs *= 2; // Exponential backoff
            } else {
                throw error; // Throw error if retries are exhausted
            }
        }
    }
};

const fetchSingleMint = async () => {
    try {
        console.log(`Fetching metadata for mint: ${firstMint}`);

        // Compute Metadata Account PDA
        const metadataPDA = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata'),
                METADATA_PROGRAM_ID.toBuffer(),
                new PublicKey(firstMint).toBuffer(),
            ],
            METADATA_PROGRAM_ID
        )[0];

        // Retry fetching the account info
        const accountInfo = await retryWithBackoff(
            () => connection.getAccountInfo(metadataPDA),
            10, // Number of retries
            500 // Initial delay in milliseconds
        );

        if (!accountInfo) {
            console.error(`Metadata account not found for mint: ${firstMint}`);
            return;
        }

        // Parse the metadata URI
        const metadataBuffer = accountInfo.data;
        const metadataJsonStart = metadataBuffer.indexOf('http');
        const metadataUri = metadataJsonStart !== -1
            ? metadataBuffer.slice(metadataJsonStart).toString().split('\0')[0]
            : null;

        if (!metadataUri || !metadataUri.startsWith('http')) {
            console.error(`Invalid URI for mint: ${firstMint}`);
            return;
        }

        console.log(`Metadata URI: ${metadataUri}`);

        // Retry fetching metadata JSON
        const metadataJson = await retryWithBackoff(
            () => fetch(metadataUri).then((res) => res.json()),
            10, // Number of retries
            500 // Initial delay in milliseconds
        );

        console.log('Attributes:', metadataJson.attributes || 'No attributes found');

        // Save to test-single-attribute.json
        const data = [
            {
                mint: firstMint,
                attributes: metadataJson.attributes || []
            }
        ];
        fs.writeFileSync(testOutputPath, JSON.stringify(data, null, 2));
        console.log(`Attributes saved to ${testOutputPath}`);
    } catch (error) {
        console.error(`Failed to fetch metadata for ${firstMint}:`, error.message);
    }
};

fetchSingleMint();

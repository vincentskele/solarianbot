const { Connection, PublicKey } = require('@solana/web3.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Define the Metaplex Metadata Program ID
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Solana RPC endpoint
const SOLANA_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=ff6aab3e-62c6-480d-b1f0-5be8c7b7ecd4';
const connection = new Connection(SOLANA_RPC_URL);

// Load mint addresses from ../data/mintlist.json
const mintListPath = path.resolve(__dirname, '../data/mintlist.json');
const mintAddresses = JSON.parse(fs.readFileSync(mintListPath, 'utf-8'));

// Output path for attributes
const attributesOutputPath = path.resolve(__dirname, '../data/attributes.json');

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

const fetchAttributes = async () => {
    let processedMints = [];

    // Load existing data if attributes.json exists
    if (fs.existsSync(attributesOutputPath)) {
        const existingData = JSON.parse(fs.readFileSync(attributesOutputPath, 'utf-8'));
        processedMints = existingData.map((entry) => entry.mint);
    }

    const attributesData = processedMints.length
        ? JSON.parse(fs.readFileSync(attributesOutputPath, 'utf-8'))
        : [];

    console.log(`Found ${mintAddresses.length} mint addresses. Starting fetch...`);

    for (const mint of mintAddresses) {
        if (processedMints.includes(mint)) {
            console.log(`Skipping already processed mint: ${mint}`);
            continue;
        }

        try {
            console.log(`Fetching metadata for mint: ${mint}`);

            // Compute Metadata Account PDA
            const metadataPDA = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('metadata'),
                    METADATA_PROGRAM_ID.toBuffer(),
                    new PublicKey(mint).toBuffer(),
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
                console.error(`Metadata account not found for mint: ${mint}`);
                continue;
            }

            // Parse the metadata URI
            const metadataBuffer = accountInfo.data;
            const metadataJsonStart = metadataBuffer.indexOf('http');
            const metadataUri = metadataJsonStart !== -1
                ? metadataBuffer.slice(metadataJsonStart).toString().split('\0')[0]
                : null;

            if (!metadataUri || !metadataUri.startsWith('http')) {
                console.error(`Invalid URI for mint: ${mint}`);
                continue;
            }

            console.log(`Metadata URI: ${metadataUri}`);

            // Retry fetching metadata JSON
            const metadataJson = await retryWithBackoff(
                () => fetch(metadataUri).then((res) => res.json()),
                10, // Number of retries
                500 // Initial delay in milliseconds
            );

            console.log('Attributes:', metadataJson.attributes || 'No attributes found');

            // Append the fetched data to the attributesData array
            attributesData.push({
                mint,
                attributes: metadataJson.attributes || [],
            });

            // Save progress incrementally
            fs.writeFileSync(attributesOutputPath, JSON.stringify(attributesData, null, 2));
            console.log(`Progress saved to ${attributesOutputPath}`);

            // Add a delay to prevent rate-limiting
            await delay(100);
        } catch (error) {
            console.error(`Failed to fetch metadata for ${mint}:`, error.message);
        }
    }

    console.log(`Attributes scraping completed. Data saved to ${attributesOutputPath}`);
};

fetchAttributes().catch((error) => {
    console.error('An error occurred during scraping:', error.message);
});

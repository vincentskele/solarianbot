const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Paths
const entangledListPath = path.resolve(__dirname, '../data/entangled.json');
const testImgDirectory = path.resolve(__dirname, '../data/img/test');

// Create the test directory if it doesn't exist
if (!fs.existsSync(testImgDirectory)) {
    fs.mkdirSync(testImgDirectory, { recursive: true });
}

// Load and process entangled JSON (extract keys or values)
const entangledData = JSON.parse(fs.readFileSync(entangledListPath, 'utf-8'));
const entangledAddresses = Object.values(entangledData); // Change to Object.values(entangledData) if needed

// Utility: Delay function to avoid overwhelming the server
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to download and save a GIF
const downloadGif = async (mint) => {
    try {
        console.log(`Fetching GIF for mint: ${mint}`);

        // Construct the GIF URL
        const gifUrl = `https://api.solarians.click/render/${mint}`;

        // Path to save the GIF
        const gifPath = path.join(testImgDirectory, `${mint}.gif`);

        // Skip if the GIF is already downloaded
        if (fs.existsSync(gifPath)) {
            console.log(`GIF already exists for mint: ${mint}`);
            return;
        }

        // Fetch the GIF
        const response = await fetch(gifUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${gifUrl}: ${response.statusText}`);
        }

        // Save the GIF to the local file system
        const buffer = await response.buffer();
        fs.writeFileSync(gifPath, buffer);
        console.log(`GIF saved at: ${gifPath}`);
    } catch (error) {
        console.error(`Error fetching GIF for mint: ${mint}`, error.message);
    }
};

// Function to scrape a limited number of GIFs
const scrapeGifs = async () => {
    console.log(`Found ${entangledAddresses.length} entangled addresses. Starting GIF download...`);

    // Process only the first 10 addresses for testing
    const testMints = entangledAddresses.slice(0, 10);

    for (const mint of testMints) {
        await downloadGif(mint);
        await delay(100); // Delay to prevent overwhelming the server
    }

    console.log('Test GIF scraping complete.');
};

// Start the scraping process
scrapeGifs().catch((error) => {
    console.error('An error occurred during scraping:', error.message);
});

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Paths
const mintListPath = path.resolve(__dirname, '../data/mintlist.json');
const imgDirectory = path.resolve(__dirname, '../data/img');

// Create the img directory if it doesn't exist
if (!fs.existsSync(imgDirectory)) {
    fs.mkdirSync(imgDirectory, { recursive: true });
}

// Load mint addresses from mintlist.json
const mintAddresses = JSON.parse(fs.readFileSync(mintListPath, 'utf-8'));

// Utility: Delay function to avoid overwhelming the server
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to download and save a GIF
const downloadGif = async (mint) => {
    try {
        console.log(`Fetching GIF for mint: ${mint}`);

        // Construct the GIF URL
        const gifUrl = `https://api.solarians.click/render/${mint}`;

        // Path to save the GIF
        const gifPath = path.join(imgDirectory, `${mint}.gif`);

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

// Function to scrape all GIFs
const scrapeGifs = async () => {
    console.log(`Found ${mintAddresses.length} mint addresses. Starting GIF download...`);

    for (const mint of mintAddresses) {
        await downloadGif(mint);
        await delay(100); // Delay to prevent overwhelming the server
    }

    console.log('All GIFs have been processed.');
};

// Start the scraping process
scrapeGifs().catch((error) => {
    console.error('An error occurred during scraping:', error.message);
});

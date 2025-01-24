const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomattribute')
        .setDescription('Replies with a random attribute, its associated Solarian GIF, and the mint number'),
    async execute(context) {
        try {
            // Path to the attributes JSON, entangled keys, and GIF directory
            const attributesPath = path.join(__dirname, '../data/attributes.json');
            const imgDirectory = path.join(__dirname, '../data/img');
            const entangledPath = path.join(__dirname, '../data/entangled.json');

            // Load the attributes data and entangled key map
            const attributesData = JSON.parse(fs.readFileSync(attributesPath, 'utf-8'));
            const entangledKeys = JSON.parse(fs.readFileSync(entangledPath, 'utf-8'));

            // List of trait types to choose from
            const traitTypes = ['Feet', 'Torso', 'Eyes', 'Mouth', 'Hands', 'Antenna', 'Head'];

            // Randomly pick a mint
            const randomMint = attributesData[Math.floor(Math.random() * attributesData.length)];

            // Filter attributes for the specific trait types
            const filteredAttributes = randomMint.attributes.filter(attr =>
                traitTypes.includes(attr.trait_type)
            );

            if (filteredAttributes.length === 0) {
                const noDataMessage = 'No valid attributes found for this mint.';
                return context.reply ? context.reply(noDataMessage) : await context.reply(noDataMessage);
            }

            // Randomly pick an attribute from the filtered list
            const randomAttribute =
                filteredAttributes[Math.floor(Math.random() * filteredAttributes.length)];

            // Get the mint number
            const mintNumberAttr = randomMint.attributes.find(attr => attr.trait_type === 'Mint #');
            const mintNumber = mintNumberAttr ? mintNumberAttr.value : 'Unknown';

            // Cross-reference the mint hash with the image directory
            let mintHash = randomMint.mint;
            let gifPath = path.join(imgDirectory, `${mintHash}.gif`);
            console.log(`Checking original GIF path: ${gifPath}`); // Debugging log

            // Check if the original GIF exists
            if (!fs.existsSync(gifPath)) {
                console.log(`Original GIF not found for: ${mintHash}`); // Debugging log

                // Attempt to use the entangled key (value) if original GIF is missing
                const entangledHash = entangledKeys[mintHash];
                if (entangledHash) {
                    gifPath = path.join(imgDirectory, `${entangledHash}.gif`);
                    console.log(`Checking entangled GIF path: ${gifPath}`); // Debugging log

                    // Check if the entangled GIF exists
                    if (!fs.existsSync(gifPath)) {
                        console.log(`Entangled GIF still not found: ${gifPath}`);
                        mintHash = entangledHash; // Ensure mintHash reflects the entangled key for error messages
                    } else {
                        mintHash = entangledHash; // Update mintHash for successful entangled fallback
                    }
                } else {
                    console.log(`No entangled key found for: ${mintHash}`); // Debugging log
                }
            }

            // Prepare the response
            let response = `Random attribute: ${randomAttribute.trait_type} - ${randomAttribute.value}\nMint #: ${mintNumber}`;

            // Check if the GIF file exists after entangled fallback
            if (fs.existsSync(gifPath)) {
                // Send the response with the GIF
                if (context.reply) {
                    return context.reply({
                        content: response,
                        files: [gifPath],
                    });
                } else if (context.isCommand && context.isCommand()) {
                    return await context.reply({
                        content: response,
                        files: [gifPath],
                    });
                }
            } else {
                // Notify the user if no GIF was found, even after using the entangled key
                response += `\nNo associated GIF found for mint: ${mintHash} (including entangled key)`;
                if (context.reply) {
                    return context.reply(response);
                } else if (context.isCommand && context.isCommand()) {
                    return await context.reply(response);
                }
            }
        } catch (error) {
            console.error('Error executing randomattribute command:', error);

            // Handle errors gracefully
            const errorMessage = 'An error occurred while fetching a random attribute.';
            if (context.reply) {
                return context.reply(errorMessage);
            } else if (context.isCommand && context.isCommand()) {
                return await context.reply(errorMessage);
            }
        }
    },
};

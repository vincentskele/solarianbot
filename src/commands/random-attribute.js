const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomattribute')
        .setDescription('Replies with a random attribute, its associated Solarian GIF, and the mint number'),
    async execute(context) {
        try {
            // Path to the attributes JSON and GIF directory
            const attributesPath = path.join(__dirname, '../data/attributes.json');
            const imgDirectory = path.join(__dirname, '../data/img');

            // Load the attributes data
            const attributesData = JSON.parse(fs.readFileSync(attributesPath, 'utf-8'));

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
                if (context.reply) {
                    return context.reply(noDataMessage);
                } else if (context.isCommand && context.isCommand()) {
                    return await context.reply(noDataMessage);
                }
            }

            // Randomly pick an attribute from the filtered list
            const randomAttribute =
                filteredAttributes[Math.floor(Math.random() * filteredAttributes.length)];

            // Get the mint number
            const mintNumberAttr = randomMint.attributes.find(attr => attr.trait_type === 'Mint #');
            const mintNumber = mintNumberAttr ? mintNumberAttr.value : 'Unknown';

            // Cross-reference the mint hash with the image directory
            const mintHash = randomMint.mint;
            const gifPath = path.join(imgDirectory, `${mintHash}.gif`);

            // Check if the GIF exists
            if (!fs.existsSync(gifPath)) {
                const noGifMessage = `Random attribute: ${randomAttribute.trait_type} - ${randomAttribute.value}\nMint #: ${mintNumber}\nNo associated GIF found for mint: ${mintHash}`;
                if (context.reply) {
                    return context.reply(noGifMessage);
                } else if (context.isCommand && context.isCommand()) {
                    return await context.reply(noGifMessage);
                }
            }

            // Reply with the random attribute, mint number, and its associated GIF
            const response = `Random attribute: ${randomAttribute.trait_type} - ${randomAttribute.value}\nMint #: ${mintNumber}`;
            if (context.reply) {
                // Prefix-based execution
                context.reply({
                    content: response,
                    files: [gifPath],
                });
            } else if (context.isCommand && context.isCommand()) {
                // Slash command execution
                await context.reply({
                    content: response,
                    files: [gifPath],
                });
            }
        } catch (error) {
            console.error('Error executing randomattribute command:', error);

            // Handle errors gracefully
            const errorMessage = 'An error occurred while fetching a random attribute.';
            if (context.reply) {
                context.reply(errorMessage);
            } else if (context.isCommand && context.isCommand()) {
                await context.reply(errorMessage);
            }
        }
    },
};

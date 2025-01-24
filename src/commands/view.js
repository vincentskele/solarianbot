const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'view',
    description: 'View details about a specific mint by its Mint #',
    data: new SlashCommandBuilder()
        .setName('view')
        .setDescription('View details about a specific mint')
        .addIntegerOption(option =>
            option.setName('mint_number').setDescription('The mint number to view').setRequired(true)
        ),
    async execute(context) {
        try {
            // Determine mint number
            const mintNumber = context.options
                ? context.options.getInteger('mint_number').toString() // Slash command
                : context.args[0]?.toString(); // Prefix command

            if (!mintNumber || isNaN(parseInt(mintNumber, 10))) {
                return context.reply('Invalid Mint #. It must be a number. Usage: `$view <Mint #>`');
            }

            // Load data files
            const attributesPath = path.join(__dirname, '../data/attributes.json');
            const entangledPath = path.join(__dirname, '../data/entangled.json');
            const imgDirectory = path.join(__dirname, '../data/img');
            const attributesData = JSON.parse(fs.readFileSync(attributesPath, 'utf-8'));
            const entangledKeys = JSON.parse(fs.readFileSync(entangledPath, 'utf-8'));

            // Find metadata
            const mintMetadata = attributesData.find(item =>
                item.attributes.some(attr => attr.trait_type === 'Mint #' && attr.value === mintNumber)
            );

            if (!mintMetadata) {
                return context.reply(`No metadata found for Mint #: ${mintNumber}`);
            }

            // Locate GIF
            const mintHash = mintMetadata.mint;
            let gifPath = path.join(imgDirectory, `${mintHash}.gif`);
            if (!fs.existsSync(gifPath)) {
                const entangledHash = entangledKeys[mintHash];
                gifPath = entangledHash ? path.join(imgDirectory, `${entangledHash}.gif`) : null;
                if (gifPath && !fs.existsSync(gifPath)) gifPath = null;
            }

            // Format output
            const title = mintMetadata.attributes.find(attr => attr.trait_type === 'Title')?.value || 'Unknown';
            const level = mintMetadata.attributes.find(attr => attr.trait_type === 'Level')?.value || 'Unknown';
            const luck = mintMetadata.attributes.find(attr => attr.trait_type === 'Luck')?.value || 'Unknown';
            const rarity = mintMetadata.attributes.find(attr => attr.trait_type === 'Average Rarity')?.value || 'Unknown';

            const traits = mintMetadata.attributes
                .filter(attr => !['Mint #', 'Title', 'Level', 'Luck', 'Average Rarity'].includes(attr.trait_type))
                .map(attr => `**${attr.trait_type}:** ${attr.value}`)
                .join('\n');

            let response = `**Details for Mint #: ${mintNumber}**\n`;
            response += `**Title:** ${title}\n`;
            response += `**Level:** ${level}\n`;
            response += `**Luck:** ${luck}\n`;
            response += `**Average Rarity:** ${rarity}\n`;
            response += `${traits}`;

            // Send response
            if (gifPath) {
                return context.reply({ content: response, files: [gifPath] });
            } else {
                response += `\n\n*No associated GIF found for mint hash: ${mintHash}*`;
                return context.reply(response);
            }
        } catch (error) {
            console.error('Error in view command:', error);
            return context.reply('An error occurred while retrieving mint details.');
        }
    },
};

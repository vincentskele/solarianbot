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
            option
                .setName('mint_number')
                .setDescription('The mint number to view')
                .setRequired(true)
        ),
    async execute(context) {
        try {
            // Determine mint number
            const mintNumber = context.options
                ? context.options.getInteger('mint_number').toString() // Slash command usage
                : context.args[0]?.toString(); // Prefix command usage

            if (!mintNumber || isNaN(parseInt(mintNumber, 10))) {
                return context.reply('Invalid Mint #. It must be a number. Usage: $view <Mint #>');
            }

            // Load merged data (with Mint and Entangled fields)
            const mergedPath = path.join(__dirname, '../data/merged_mints.json');
            const imgDirectory = path.join(__dirname, '../data/img');

            const mergedData = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));

            // Find metadata for the requested MintNumber
            const metadata = mergedData.find(item => item.MintNumber === parseInt(mintNumber, 10));
            if (!metadata) {
                return context.reply(`No metadata found for Mint #: ${mintNumber}`);
            }

            // Attempt to locate the corresponding GIF
            let gifPath = null;

            // 1) If "Entangled" is present, check for that GIF first
            if (metadata.Entangled) {
                const entangledGifPath = path.join(imgDirectory, `${metadata.Entangled}.gif`);
                if (fs.existsSync(entangledGifPath)) {
                    gifPath = entangledGifPath;
                }
            }

            // 2) If not found yet, or no Entangled field, check the "Mint" GIF
            if (!gifPath && metadata.Mint) {
                const mintGifPath = path.join(imgDirectory, `${metadata.Mint}.gif`);
                if (fs.existsSync(mintGifPath)) {
                    gifPath = mintGifPath;
                }
            }

            // Format the date
            const createdDate = new Date(metadata.Created);
            const formattedDate = createdDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            });

            // Extract key attributes
            const title = metadata.Attributes.find(attr => attr.trait_type === 'Title')?.value || 'Unknown';
            const level = metadata.Attributes.find(attr => attr.trait_type === 'Level')?.value || 'Unknown';
            const luck = metadata.Attributes.find(attr => attr.trait_type === 'Luck')?.value || 'Unknown';
            const rarity = metadata.Attributes.find(attr => attr.trait_type === 'Average Rarity')?.value || 'Unknown';

            // Compile other attributes (excluding the ones we already displayed)
            const traits = metadata.Attributes
                .filter(attr => !['Mint #', 'Title', 'Level', 'Luck', 'Average Rarity'].includes(attr.trait_type))
                .map(attr => `**${attr.trait_type}:** ${attr.value}`)
                .join('\n');

            // Build response message
            let response = `**Details for Mint #: ${mintNumber}**\n`;
            response += `**Name:** ${metadata.Name}\n`;
            response += `**Created:** ${formattedDate}\n`;
            response += `**Title:** ${title}\n`;
            response += `**Level:** ${level}\n`;
            response += `**Luck:** ${luck}\n`;
            response += `**Average Rarity:** ${rarity}\n`;
            if (traits) response += `\n${traits}`;

            // Send the reply with or without the GIF
            if (gifPath) {
                return context.reply({ content: response, files: [gifPath] });
            } else {
                // If neither Entangled nor Mint GIF was found
                response += `\n\n*No associated GIF found for Mint #: ${mintNumber}*`;
                return context.reply(response);
            }
        } catch (error) {
            console.error('Error in view command:', error);
            return context.reply('An error occurred while retrieving mint details.');
        }
    },
};

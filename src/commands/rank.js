const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

module.exports = {
    name: 'rank',
    description: 'View details about a Solarian by its rank',
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View details about a Solarian by rank')
        .addIntegerOption(option =>
            option
                .setName('rank_number')
                .setDescription('The rank number to view')
                .setRequired(true)
        ),
    async execute(context) {
        try {
            // Retrieve the prefix from environment variables
            const prefix = process.env.PREFIX || '$';

            // Determine rank number based on command type
            const rankNumber = context.options
                ? context.options.getInteger('rank_number') // Slash command usage
                : parseInt(context.args[0], 10); // Prefix command usage

            // Validate rank number
            if (isNaN(rankNumber)) {
                return context.reply(`❌ Invalid rank number. It must be a number.\n**Usage:** \`${prefix}rank <Rank #>\` or \`/rank <Rank #>\``);
            }

            // Paths to data files
            const mergedPath = path.join(__dirname, '../data/merged_mints.json');
            const imgDirectory = path.join(__dirname, '../data/img');

            // Check if merged_mints.json exists
            if (!fs.existsSync(mergedPath)) {
                console.error('Error: merged_mints.json not found at path:', mergedPath);
                return context.reply('⚠️ Data file not found. Please try again later.');
            }

            // Load and parse merged data
            const mergedData = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));

            // Find Solarian(s) with the specified rank
            const matchingSoliarians = mergedData.filter(item => {
                const rankAttr = item.Attributes.find(attr => attr.trait_type.toLowerCase() === 'rank' || attr.trait_type.toLowerCase() === 'ranking #');
                return rankAttr && parseInt(rankAttr.value, 10) === rankNumber;
            });

            // If no Solarian found with the given rank
            if (matchingSoliarians.length === 0) {
                return context.reply(`❌ No Solarian found with Rank #: **${rankNumber}**.`);
            }

            // Prepare the response for the first matching Solarian
            const metadata = matchingSoliarians[0];

            // Attempt to locate the corresponding GIF
            let gifPath = null;

            // 1) Check for "Entangled" GIF
            if (metadata.Entangled) {
                const entangledGifPath = path.join(imgDirectory, `${metadata.Entangled}.gif`);
                if (fs.existsSync(entangledGifPath)) {
                    gifPath = entangledGifPath;
                }
            }

            // 2) If "Entangled" GIF not found, check for "Mint" GIF
            if (!gifPath && metadata.Mint) {
                const mintGifPath = path.join(imgDirectory, `${metadata.Mint}.gif`);
                if (fs.existsSync(mintGifPath)) {
                    gifPath = mintGifPath;
                }
            }

            // Extract key details
            const name = metadata.Name || 'Unknown';
            const mintNumber = metadata.MintNumber || 'Unknown';
            const rank = metadata.Attributes.find(attr => attr.trait_type.toLowerCase() === 'rank' || attr.trait_type.toLowerCase() === 'ranking #')?.value || 'Unknown';
            const title = metadata.Attributes.find(attr => attr.trait_type.toLowerCase() === 'title')?.value || 'Unknown';

            // Build response message
            let response = `**Name:** ${name}\n`;
            response += `**Mint Number:** ${mintNumber}\n`;
            response += `**Rank:** ${rank}\n`;
            response += `**Title:** ${title}\n`;

            // Reply with the response and attach the GIF (if found)
            if (gifPath) {
                return context.reply({ content: response, files: [gifPath] });
            } else {
                return context.reply(response);
            }
        } catch (error) {
            console.error('Error in rank command:', error);
            return context.reply('⚠️ An error occurred while retrieving Solarian details. Please try again later.');
        }
    },
};

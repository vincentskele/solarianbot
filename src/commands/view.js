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
            const mintNumber = context.options
                ? context.options.getInteger('mint_number').toString()
                : context.args[0]?.toString();

            if (!mintNumber || isNaN(parseInt(mintNumber, 10))) {
                return context.reply('Invalid Mint #. It must be a number. Usage: $view <Mint #>');
            }

            const mergedPath = path.join(__dirname, '../data/merged_mints.json');
            const imgDirectory = path.join(__dirname, '../data/img');
            const mergedData = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));

            const metadata = mergedData.find(item => item.MintNumber === parseInt(mintNumber, 10));
            if (!metadata) {
                return context.reply(`No metadata found for Mint #: ${mintNumber}`);
            }

            let gifPath = null;
            if (metadata.Entangled) {
                const entangledGifPath = path.join(imgDirectory, `${metadata.Entangled}.gif`);
                if (fs.existsSync(entangledGifPath)) {
                    gifPath = entangledGifPath;
                }
            }

            if (!gifPath && metadata.Mint) {
                const mintGifPath = path.join(imgDirectory, `${metadata.Mint}.gif`);
                if (fs.existsSync(mintGifPath)) {
                    gifPath = mintGifPath;
                }
            }

            const createdDate = new Date(metadata.Created).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            });

            const title = metadata.Attributes.find(attr => attr.trait_type === 'Title')?.value || 'Unknown';
            const level = metadata.Attributes.find(attr => attr.trait_type === 'Level')?.value || 'Unknown';
            const luck = metadata.Attributes.find(attr => attr.trait_type === 'Luck')?.value || 'Unknown';
            const rarity = metadata.Attributes.find(attr => attr.trait_type === 'Average Rarity')?.value || 'Unknown';

            const traits = metadata.Attributes
                .filter(attr => !['Mint #', 'Title', 'Level', 'Luck', 'Average Rarity'].includes(attr.trait_type))
                .map(attr => `**${attr.trait_type}:** ${attr.value}`)
                .join('\n');

            let response = `**Details for Mint #: ${mintNumber}**\n`;
            response += `**Name:** ${metadata.Name}\n`;
            response += `**Created:** ${createdDate}\n`;
            response += `**Title:** ${title}\n`;
            response += `**Level:** ${level}\n`;
            response += `**Luck:** ${luck}\n`;
            response += `**Average Rarity:** ${rarity}`;

            if (traits) {
                response += `\n${traits}`;
            }

            response = response.trim();

            if (gifPath) {
                return context.reply({ content: response, files: [gifPath] });
            } else {
                response += `\n*No associated GIF found for Mint #: ${mintNumber}*`;
                return context.reply(response.trim());
            }
        } catch (error) {
            console.error('Error in view command:', error);
            return context.reply('An error occurred while retrieving mint details.');
        }
    },
};

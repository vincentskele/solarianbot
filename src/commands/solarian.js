const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'solarian',
    description: 'View details about a specific mint by its Mint #',
    data: new SlashCommandBuilder()
        .setName('solarian')
        .setDescription('View details about a specific mint')
        .addIntegerOption(option =>
            option
                .setName('mint_number')
                .setDescription('The mint number to view')
                .setRequired(true)
        ),
    async execute(context) {
        try {
            const isInteraction = context.isChatInputCommand?.();
            const userId = isInteraction ? context.user.id : context.author?.id;

            // If it's a slash command, `mintNumber` is from context.options;
            // otherwise it's from context.args (classic command style).
            const mintNumber = isInteraction
                ? context.options.getInteger('mint_number').toString()
                : context.args[0]?.toString();

            if (!mintNumber || isNaN(parseInt(mintNumber, 10))) {
                const errorMessage = `❌ <@${userId}> Invalid Mint #. It must be a number.\nUsage: \`$solarian <Mint #>\``;
                return context.reply({
                    content: errorMessage,
                    allowedMentions: { parse: ['users'] }
                });
            }

            const mergedPath = path.join(__dirname, '../data/merged_mints.json');
            const imgDirectory = path.join(__dirname, '../data/img');
            const mergedData = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));

            // Find metadata for the requested mintNumber
            const metadata = mergedData.find(item => item.MintNumber === parseInt(mintNumber, 10));
            if (!metadata) {
                const notFoundMessage = `❌ <@${userId}> No metadata found for Mint #: ${mintNumber}`;
                return context.reply({
                    content: notFoundMessage,
                    allowedMentions: { parse: ['users'] }
                });
            }

            // Determine the correct GIF path if one exists
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

            // Extract title from the attributes
            const title = metadata.Attributes.find(attr => attr.trait_type === 'Title')?.value || 'Unknown';

            // Filter out the attributes we don't want to display
            const traits = metadata.Attributes
                .filter(attr => !['Mint #', 'Title', 'Level', 'Luck', 'Average Rarity', 'Created'].includes(attr.trait_type))
                .map(attr => `**${attr.trait_type}:** ${attr.value}`)
                .join('\n');

            // Build the embed
            const embed = new EmbedBuilder()
                .setTitle(`Details for Mint #: ${mintNumber}`)
                .setColor(0xE69349) // Solarian orange color
                .setDescription(`**Name:** ${metadata.Name}`)
                .addFields({ name: 'Title', value: title, inline: true });

            if (traits) {
                embed.addFields({ name: 'Attributes', value: traits });
            }

            if (gifPath) {
                embed.setImage(`attachment://${path.basename(gifPath)}`);
            }

            // Build the reply object
            const replyOptions = {
                content: `<@${userId}>`,  // This ensures it pings the user
                embeds: [embed],
                files: gifPath ? [{ attachment: gifPath, name: path.basename(gifPath) }] : [],
                allowedMentions: { parse: ['users'] }
            };

            // If it's a non-slash command, you can also set `reference` to the original message
            // so it directly replies (threads under the same message). Not strictly required.
            if (!isInteraction) {
                replyOptions.reference = context.message;
            }

            return context.reply(replyOptions);

        } catch (error) {
            console.error('Error in solarian command:', error);
            const errorMessage = `❌ <@${isInteraction ? context.user.id : context.author?.id}> An error occurred while retrieving mint details.`;
            return context.reply({
                content: errorMessage,
                allowedMentions: { parse: ['users'] }
            });
        }
    },
};

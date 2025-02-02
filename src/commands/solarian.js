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

            const metadata = mergedData.find(item => item.MintNumber === parseInt(mintNumber, 10));
            if (!metadata) {
                const notFoundMessage = `❌ <@${userId}> No metadata found for Mint #: ${mintNumber}`;
                return context.reply({
                    content: notFoundMessage,
                    allowedMentions: { parse: ['users'] }
                });
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

            const title = metadata.Attributes.find(attr => attr.trait_type === 'Title')?.value || 'Unknown';

            // Fetching the rank properly using "Ranking #"
            const rank = metadata.Attributes.find(attr => attr.trait_type === 'Ranking #')?.value || 'N/A';

            const traits = metadata.Attributes.reduce((acc, attr) => {
                const key = attr.trait_type.toLowerCase();
                acc[key] = attr.value;
                return acc;
            }, {});

            const embed = new EmbedBuilder()
                .setAuthor({ name: `Solarian #${mintNumber}` })
                .setTitle(metadata.Name)
                .setColor(0xE69349) // Solarian orange color
                .setDescription(`**Title**: ${title}`)
                .addFields(
                    { name: 'Rank', value: `${rank}`, inline: true },
                    { name: 'Antenna', value: `${traits['antenna'] || 'N/A'}`, inline: true },
                    { name: 'Mouth', value: `${traits['mouth'] || 'N/A'}`, inline: true },
                    { name: 'Torso', value: `${traits['torso'] || 'N/A'}`, inline: true },
                    { name: 'Feet', value: `${traits['feet'] || 'N/A'}`, inline: true },
                    { name: 'Scene', value: `${traits['scene'] || 'N/A'}`, inline: true },
                    { name: 'Hands', value: `${traits['hands'] || 'N/A'}`, inline: true },
                    { name: 'Head', value: `${traits['head'] || 'N/A'}`, inline: true },
                    { name: 'Eyes', value: `${traits['eyes'] || 'N/A'}`, inline: true }
                );

            if (gifPath) {
                embed.setThumbnail(`attachment://${path.basename(gifPath)}`);
            }

            const replyOptions = {
                content: `<@${userId}>`,
                embeds: [embed],
                files: gifPath ? [{ attachment: gifPath, name: path.basename(gifPath) }] : [],
                allowedMentions: { parse: ['users'] }
            };

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

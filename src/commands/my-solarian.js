const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Paths to required data
const holdersFilePath = path.resolve(__dirname, '../../../robo-check/src/data/holders.json');
const imgDirectory = path.resolve(__dirname, '../data/img');
const mergedMintsPath = path.resolve(__dirname, '../data/merged_mints.json');

// Hardcoded list of known titles
const fixedTitles = [
    "Drone", "Administrator", "Squad Leader", "Guard", "Prospector", "Monitor", "Pilot", "Spy", "Commander"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('my-solarian')
        .setDescription('Sends an animated GIF with all of your Solarians with the specified attribute')
        .addStringOption(option =>
            option.setName('attribute')
                .setDescription('Search for a title or any trait (e.g., "bigboy", "coincutter")')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        let focusedValue = interaction.options.getFocused().toLowerCase();
        let attributeOptions = [...fixedTitles];

        if (fs.existsSync(mergedMintsPath)) {
            const mergedMints = JSON.parse(fs.readFileSync(mergedMintsPath, 'utf-8'));
            let allAttributes = new Set();
            mergedMints.forEach(mint => {
                if (mint.Attributes) {
                    mint.Attributes.forEach(attr => allAttributes.add(attr.value));
                }
            });
            attributeOptions.push(...Array.from(allAttributes));
        }

        const filtered = attributeOptions
            .filter(attr => attr.toLowerCase().includes(focusedValue))
            .slice(0, 25);

        await interaction.respond(filtered.map(attr => ({ name: attr, value: attr })));
    },

    async execute(interaction) {
        try {
            await interaction.deferReply();

            if (!fs.existsSync(holdersFilePath) || !fs.existsSync(mergedMintsPath)) {
                return await interaction.editReply('⚠️ Required data files are missing.');
            }

            const holdersData = JSON.parse(fs.readFileSync(holdersFilePath, 'utf-8'));
            const mergedMints = JSON.parse(fs.readFileSync(mergedMintsPath, 'utf-8'));
            const availableImages = fs.existsSync(imgDirectory) ? fs.readdirSync(imgDirectory) : [];

            const searchAttribute = interaction.options.getString('attribute').toLowerCase();

            const userId = interaction.user.id;
            const linkedHolder = holdersData.find(h => h.discordId === userId);
            if (!linkedHolder) {
                return await interaction.editReply('⚠️ No linked wallet found. Please link your wallet first.');
            }

            const walletAddress = linkedHolder.walletAddress;
            const holder = holdersData.find(h => h.walletAddress === walletAddress);
            const userMints = holder?.tokens?.map(t => t.mint) || [];

            if (userMints.length === 0) {
                return await interaction.editReply('📦 No Solarians owned.');
            }

            const uniqueSolarians = new Map();
            userMints.forEach(mint => {
                let mintData = mergedMints.find(entry => entry.Mint === mint || entry.Entangled === mint);
                if (!mintData) return;

                const hasMatchingAttribute = mintData.Attributes.some(attr =>
                    attr.value.toLowerCase().includes(searchAttribute)
                );

                if (!hasMatchingAttribute) return;

                const image = availableImages.find(img =>
                    img.startsWith(mintData.Mint) ||
                    (mintData.Entangled && img.startsWith(mintData.Entangled))
                );

                if (image && !uniqueSolarians.has(mintData.Mint)) {
                    uniqueSolarians.set(mintData.Mint, { mint, image, mintData });
                }
            });

            const matchingSolarians = [...uniqueSolarians.values()];

            if (matchingSolarians.length === 0) {
                return await interaction.editReply(`❌ No Solarians found with attribute: **${searchAttribute}**.`);
            }

            let page = 0;
            const totalPages = matchingSolarians.length;

            const generatePage = (pageIndex) => {
                const { mint, image, mintData } = matchingSolarians[pageIndex];
                const embed = new EmbedBuilder()
                    .setColor(0xE69349)
                    .setTitle(`Filtered Solarians - ${searchAttribute}`)
                    .setDescription(`🔍 **Attribute:** ${searchAttribute}\n📦 **Matching Solarians:** ${totalPages}`)
                    .addFields({ name: 'Mint #', value: mintData.MintNumber?.toString() || 'N/A', inline: true })
                    .setFooter({ text: `Solarian ${pageIndex + 1} of ${totalPages}` })
                    .setImage(`attachment://${image}`);

                return { embed, image };
            };

            const { embed, image } = generatePage(page);
            const file = { attachment: path.join(imgDirectory, image), name: image };

            const uniquePrevId = `prev_${interaction.user.id}_${Date.now()}`;
            const uniqueNextId = `next_${interaction.user.id}_${Date.now()}`;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(uniquePrevId)
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId(uniqueNextId)
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            );

            const message = await interaction.editReply({ embeds: [embed], files: [file], components: totalPages > 1 ? [row] : [] });

            if (totalPages <= 1) return;

            const collector = message.createMessageComponentCollector({
                filter: btn => btn.user.id === interaction.user.id && (btn.customId === uniquePrevId || btn.customId === uniqueNextId),
                time: 600000
            });

            collector.on('collect', async btn => {
                if (btn.customId === uniquePrevId && page > 0) page--;
                else if (btn.customId === uniqueNextId && page < totalPages - 1) page++;

                const { embed: newEmbed, image: newImage } = generatePage(page);
                const newFile = { attachment: path.join(imgDirectory, newImage), name: newImage };

                await btn.update({ embeds: [newEmbed], files: [newFile], components: [row] });
            });

        } catch (error) {
            console.error('Error executing my-solarian command:', error);
            await interaction.editReply('⚠️ An error occurred while retrieving Solarians.');
        }
    },
};

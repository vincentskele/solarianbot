const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Paths to required data
const holdersFilePath = path.resolve(__dirname, '../../../robo-check/src/data/holders.json');
const imgDirectory = path.resolve(__dirname, '../data/img');
const mergedMintsPath = path.resolve(__dirname, '../data/merged_mints.json');

// Hardcoded list of known titles (always shown first in autocomplete)
const fixedTitles = [
    "Drone",
    "Administrator",
    "Squad Leader",
    "Guard",
    "Prospector",
    "Monitor",
    "Pilot",
    "Spy",
    "Commander"
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
        let attributeOptions = [...fixedTitles]; // Start with the 9 fixed titles

        if (fs.existsSync(mergedMintsPath)) {
            const mergedMints = JSON.parse(fs.readFileSync(mergedMintsPath, 'utf-8'));

            // Extract all unique attributes
            let allAttributes = new Set();
            mergedMints.forEach(mint => {
                if (mint.Attributes) {
                    mint.Attributes.forEach(attr => allAttributes.add(attr.value));
                }
            });

            // Add all attributes if user has started typing
            if (focusedValue.length > 0) {
                attributeOptions.push(...Array.from(allAttributes));
            }
        }

        // Filter options based on what the user is typing
        const filtered = attributeOptions
            .filter(attr => attr.toLowerCase().includes(focusedValue))
            .slice(0, 25); // Discord allows max 25 options

        await interaction.respond(filtered.map(attr => ({ name: attr, value: attr })));
    },

    async execute(interaction) {
        try {
            await interaction.deferReply();

            if (!fs.existsSync(holdersFilePath) || !fs.existsSync(mergedMintsPath)) {
                return await interaction.editReply('⚠️ Required data files are missing.');
            }

            // Load holders and merged mints data
            const holdersData = JSON.parse(fs.readFileSync(holdersFilePath, 'utf-8'));
            const mergedMints = JSON.parse(fs.readFileSync(mergedMintsPath, 'utf-8'));
            const availableImages = fs.existsSync(imgDirectory) ? fs.readdirSync(imgDirectory) : [];

            // Get the attribute to search for
            const searchAttribute = interaction.options.getString('attribute').toLowerCase();

            // Auto-detect wallet
            const userId = interaction.user.id;
            const linkedHolder = holdersData.find(h => h.discordId === userId);
            if (!linkedHolder) {
                return await interaction.editReply('⚠️ No linked wallet found. Please link your wallet first.');
            }

            const walletAddress = linkedHolder.walletAddress;
            const holder = holdersData.find(h => h.walletAddress === walletAddress);
            if (!holder || !holder.solarians || holder.solarians.length === 0) {
                return await interaction.editReply('📦 No Solarians owned.');
            }

            // Find Solarians matching the attribute
            const matchingSolarians = holder.solarians
                .map(solarian => {
                    let mintData = mergedMints.find(entry => entry.Mint === solarian || entry.Entangled === solarian);
                    if (!mintData) return null;

                    // Check if any attribute matches the search
                    const hasMatchingAttribute = mintData.Attributes.some(attr => 
                        attr.value.toLowerCase().includes(searchAttribute)
                    );

                    if (!hasMatchingAttribute) return null;

                    const image = availableImages.find(img => img.startsWith(mintData.Mint) || img.startsWith(mintData.Entangled));
                    return image ? { solarian, image, mintData } : null;
                })
                .filter(Boolean);

            if (matchingSolarians.length === 0) {
                return await interaction.editReply(`❌ No Solarians found with attribute: **${searchAttribute}**.`);
            }

            // Pagination setup
            let page = 0;
            const totalPages = matchingSolarians.length;

            const generatePage = (pageIndex) => {
                const { solarian, image, mintData } = matchingSolarians[pageIndex];
                const embed = new EmbedBuilder()
                    .setColor(0xE69349)
                    .setTitle(`Filtered Solarians - ${searchAttribute}`)
                    .setDescription(`🔍 **Attribute:** ${searchAttribute}\n📦 **Matching Solarians:** ${totalPages}`)
                    .setFooter({ text: `Solarian ${pageIndex + 1} of ${totalPages}` })
                    .setImage(`attachment://${image}`);

                if (mintData && mintData.MintNumber) {
                    embed.addFields({ name: 'Mint #', value: mintData.MintNumber.toString(), inline: true });
                }
                return { embed, image };
            };

            // Generate first page
            const { embed, image } = generatePage(page);

            // Prepare the file attachment
            const file = {
                attachment: path.join(imgDirectory, image),
                name: image
            };

            // Unique button IDs for session
            const uniquePrevId = `prev_${interaction.user.id}_${Date.now()}`;
            const uniqueNextId = `next_${interaction.user.id}_${Date.now()}`;

            const row = new ActionRowBuilder()
                .addComponents(
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

            // Send the first embed
            const message = await interaction.editReply({ embeds: [embed], files: [file], components: totalPages > 1 ? [row] : [] });

            if (totalPages <= 1) return;

            // Create an interaction collector for pagination
            const collector = message.createMessageComponentCollector({
                filter: btnInteraction => btnInteraction.user.id === interaction.user.id && (btnInteraction.customId === uniquePrevId || btnInteraction.customId === uniqueNextId),
                time: 600000
            });

            collector.on('collect', async btnInteraction => {
                if (btnInteraction.customId === uniquePrevId && page > 0) {
                    page--;
                } else if (btnInteraction.customId === uniqueNextId && page < totalPages - 1) {
                    page++;
                }

                const { embed: newEmbed, image: newImage } = generatePage(page);
                const newFile = {
                    attachment: path.join(imgDirectory, newImage),
                    name: newImage
                };

                const newRow = new ActionRowBuilder()
                    .addComponents(
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

                await btnInteraction.update({ embeds: [newEmbed], files: [newFile], components: [newRow] });
            });

        } catch (error) {
            console.error('Error executing my-solarian command:', error);
            await interaction.editReply('⚠️ An error occurred while retrieving Solarians.');
        }
    },
};

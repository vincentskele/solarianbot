const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Paths to required data
const holdersFilePath = path.resolve(__dirname, '../../../robo-check/src/data/holders.json');
const imgDirectory = path.resolve(__dirname, '../data/img'); // Path to GIF images
const mergedMintsPath = path.resolve(__dirname, '../data/merged_mints.json'); // Entangled IDs file

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wallet')
        .setDescription('Retrieves wallet holdings and attached Solarian GIFs')
        .addStringOption(option =>
            option.setName('wallet')
                .setDescription('Solana wallet address (optional, auto-detected if linked)')
                .setRequired(false)
        ),

    async execute(context) {
        try {
            // Check if holders.json exists
            if (!fs.existsSync(holdersFilePath)) {
                return await context.reply('⚠️ Holders data is not available.');
            }

            // Read and parse holders.json
            const rawData = fs.readFileSync(holdersFilePath, 'utf-8');
            const holdersData = JSON.parse(rawData);

            let walletAddress = context.options.getString('wallet');

            // Auto-detect wallet using Discord ID if not provided
            if (!walletAddress) {
                const userId = context.user ? context.user.id : context.author.id;
                const linkedHolder = holdersData.find(h => h.discordId === userId);

                if (linkedHolder) {
                    walletAddress = linkedHolder.walletAddress;
                } else {
                    return await context.reply('⚠️ No linked wallet found. Please provide your wallet address manually.');
                }
            }

            // Find the holder in holders.json
            const holder = holdersData.find(h => h.walletAddress === walletAddress);

            if (!holder) {
                return await context.reply('❌ No holdings found for your wallet.');
            }

            // List Solarians owned
            const solariansOwned = holder.solarians;

            if (solariansOwned.length === 0) {
                return await context.reply('📦 No Solarians owned.');
            }

            // Check if imgDirectory exists
            if (!fs.existsSync(imgDirectory)) {
                console.warn(`⚠️ Image directory not found: ${imgDirectory}`);
                return await context.reply(`📦 **Solarians Owned:** ${solariansOwned.length}\n⚠️ Image directory is missing.`);
            }

            // Load merged_mints.json if it exists
            let mergedMints = {};
            if (fs.existsSync(mergedMintsPath)) {
                const mergedData = fs.readFileSync(mergedMintsPath, 'utf-8');
                mergedMints = JSON.parse(mergedData);
            }

            // Find matching images, checking merged_mints.json for entangled IDs if needed
            const availableImages = fs.readdirSync(imgDirectory);
            const missingImages = [];

            const matchingImages = solariansOwned.map(solarian => {
                let image = availableImages.find(img => img.startsWith(solarian));

                if (!image) {
                    const matchedEntry = mergedMints.find(entry => entry.Mint === solarian || entry.Entangled === solarian);
                    if (matchedEntry) {
                        image = availableImages.find(img => img.startsWith(matchedEntry.Mint));
                        if (!image) {
                            missingImages.push({ solarian, fallbackID: matchedEntry.Mint });
                        }
                    }
                }

                return image;
            }).filter(Boolean);

            if (matchingImages.length === 0) {
                return await context.reply(`📦 **Solarians Owned:** ${solariansOwned.length}\n⚠️ No images found for these Solarians.`);
            }

            // Pagination setup
            let page = 0;
            const totalPages = matchingImages.length;

            // Function to generate embed for a page
            const generatePage = (pageIndex) => {
                const solarian = matchingImages[pageIndex];
                const embed = new EmbedBuilder()
                    .setColor(0xE69349)
                    .setTitle('Solarians Wallet Summary')
                    .setDescription(`📦 **Solarians Owned:** ${solariansOwned.length}`)
                    .setFooter({ text: `Solarian ${pageIndex + 1} of ${totalPages}` })
                    .setImage(`attachment://${solarian}`);

                return { embed, image: solarian };
            };

            // Generate first page
            const { embed, image } = generatePage(page);

            // Attach single image
            const file = {
                attachment: path.join(imgDirectory, image),
                name: image
            };

            // Unique button IDs for this session
            const uniquePrevId = `prev_${context.user.id}_${Date.now()}`;
            const uniqueNextId = `next_${context.user.id}_${Date.now()}`;

            // Create action buttons (only if more than 1 Solarian)
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

            // Send initial embed with first Solarian image
            const message = await context.reply({ embeds: [embed], files: [file], components: totalPages > 1 ? [row] : [] });

            if (totalPages <= 1) return;

            // Create an interaction collector for button clicks
            const collector = message.createMessageComponentCollector({
                filter: interaction => interaction.user.id === context.user.id && (interaction.customId === uniquePrevId || interaction.customId === uniqueNextId),
                time: 600000
            });

            collector.on('collect', async interaction => {
                if (interaction.customId === uniquePrevId && page > 0) {
                    page--;
                } else if (interaction.customId === uniqueNextId && page < totalPages - 1) {
                    page++;
                }

                // Update buttons & page content
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

                await interaction.update({ embeds: [newEmbed], files: [newFile], components: [newRow] });
            });

        } catch (error) {
            console.error('Error executing wallet command:', error);
            await context.reply('⚠️ An error occurred while retrieving wallet data.');
        }
    },
};

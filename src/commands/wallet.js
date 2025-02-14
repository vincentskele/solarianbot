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

            let walletAddress;

            // Check if the user provided a wallet manually
            if (context.isCommand && context.isCommand()) {
                walletAddress = context.options.getString('wallet');
            } else if (context.args && context.args.length > 0) {
                walletAddress = context.args[0];
            }

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
                // Attempt to find the image using the primary Mint address
                let image = availableImages.find(img => img.startsWith(solarian));

                // If no direct match, check merged_mints.json for an entry corresponding to this address
                if (!image) {
                    const matchedEntry = mergedMints.find(entry => entry.Mint === solarian || entry.Entangled === solarian);
                    if (matchedEntry) {
                        // Always use the Mint address from the matched entry as the fallback for the image search
                        image = availableImages.find(img => img.startsWith(matchedEntry.Mint));
                        if (!image) {
                            missingImages.push({ solarian, fallbackID: matchedEntry.Mint });
                        }
                    }
                }

                return image;
            }).filter(Boolean); // Remove undefined matches

            // Debug Log for missing images
            if (missingImages.length > 0) {
                console.log(`🚨 Missing images for these Solarians (fallback also failed):`, missingImages);
            }

            if (matchingImages.length === 0) {
                return await context.reply(`📦 **Solarians Owned:** ${solariansOwned.length}\n⚠️ No images found for these Solarians.`);
            }

            // Pagination setup (1 Solarian per page)
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

            // Create action buttons (only if more than 1 Solarian)
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('⬅️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1)
                );

            // Send initial embed with first Solarian image
            const message = await context.reply({ embeds: [embed], files: [file], components: totalPages > 1 ? [row] : [] });

            if (totalPages <= 1) return; // No pagination needed if only one Solarian

            // Create an interaction collector for button clicks
            const collector = message.createMessageComponentCollector({ time: 60000 }); // 60 sec timeout

            collector.on('collect', async interaction => {
                if (interaction.user.id !== context.user.id) {
                    return await interaction.reply({ content: '❌ You cannot control this menu.', ephemeral: true });
                }

                if (interaction.customId === 'prev' && page > 0) {
                    page--;
                } else if (interaction.customId === 'next' && page < totalPages - 1) {
                    page++;
                }

                // Update buttons & page content
                const { embed: newEmbed, image: newImage } = generatePage(page);
                const newRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('⬅️ Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next ➡️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === totalPages - 1)
                    );

                const newFile = {
                    attachment: path.join(imgDirectory, newImage),
                    name: newImage
                };

                await interaction.update({ embeds: [newEmbed], files: [newFile], components: [newRow] });
            });

        } catch (error) {
            console.error('Error executing my-wallet command:', error);
            await context.reply('⚠️ An error occurred while retrieving wallet data.');
        }
    },
};

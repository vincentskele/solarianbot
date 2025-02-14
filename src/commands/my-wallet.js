const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Paths to required data
const holdersFilePath = path.resolve(__dirname, '../../../robo-check/src/data/holders.json');
const imgDirectory = path.resolve(__dirname, '../data/img'); // Path to GIF images

module.exports = {
    data: new SlashCommandBuilder()
        .setName('my-wallet')
        .setDescription('Retrieves your wallet holdings and attached Solarian GIFs')
        .addStringOption(option =>
            option.setName('wallet')
                .setDescription('Your Solana wallet address (optional, auto-detected if linked)')
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
                return await context.reply(`❌ No holdings found for wallet: \`${walletAddress}\`.`);
            }

            // List Solarians owned
            const solariansOwned = holder.solarians;

            if (solariansOwned.length === 0) {
                return await context.reply(`✅ **Wallet:** \`${walletAddress}\`\n📦 No Solarians owned.`);
            }

            // Parse the /img directory and match GIFs
            const availableImages = fs.readdirSync(imgDirectory);
            const matchingImages = solariansOwned
                .map(solarian => availableImages.find(img => img.startsWith(solarian))) // Match files by prefix
                .filter(Boolean); // Remove undefined matches

            // Prepare attachments
            const attachments = matchingImages.map(img => new AttachmentBuilder(path.join(imgDirectory, img)));

            // Prepare the response
            let response = `✅ **Wallet:** \`${walletAddress}\`\n📦 **Solarians Owned:** ${solariansOwned.length}`;

            // Send message with or without images
            if (attachments.length > 0) {
                await context.reply({ content: response, files: attachments });
            } else {
                response += '\n⚠️ No images found for these Solarians.';
                await context.reply(response);
            }

        } catch (error) {
            console.error('Error executing my-wallet command:', error);
            await context.reply('⚠️ An error occurred while retrieving wallet data.');
        }
    },
};

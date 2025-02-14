const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to the holders.json file
const holdersFilePath = path.resolve(__dirname, '../../../robo-check/src/data/holders.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('my-wallet')
        .setDescription('Retrieves your wallet holdings from holders.json')
        .addStringOption(option =>
            option.setName('wallet')
                .setDescription('Your Solana wallet address (optional, auto-detected if linked)')
                .setRequired(false)
        ),

    async execute(context) {
        try {
            // Check if holders.json exists
            if (!fs.existsSync(holdersFilePath)) {
                return context.reply
                    ? await context.reply('⚠️ Holders data is not available.')
                    : await context.channel.send('⚠️ Holders data is not available.');
            }

            // Read and parse holders.json
            const rawData = fs.readFileSync(holdersFilePath, 'utf-8');
            const holdersData = JSON.parse(rawData);

            let walletAddress;

            // Check if the user provided a wallet manually
            if (context.isCommand && context.isCommand()) {
                walletAddress = context.options.getString('wallet'); // FIXED
            } else if (context.args && context.args.length > 0) {
                walletAddress = context.args[0];
            }

            // If no wallet was provided, try to auto-detect it using Discord ID
            if (!walletAddress) {
                const userId = context.user ? context.user.id : context.author.id; // Supports both slash and prefix commands
                const linkedHolder = holdersData.find(h => h.discordId === userId); // FIXED

                if (linkedHolder) {
                    walletAddress = linkedHolder.walletAddress; // FIXED
                } else {
                    return context.reply
                        ? await context.reply('⚠️ No linked wallet found. Please provide your wallet address manually.')
                        : await context.channel.send('⚠️ No linked wallet found. Please provide your wallet address manually.');
                }
            }

            // Find the wallet in holders.json
            const holder = holdersData.find(h => h.walletAddress === walletAddress); // FIXED

            if (!holder) {
                return context.reply
                    ? await context.reply(`❌ No holdings found for wallet: \`${walletAddress}\`.`)
                    : await context.channel.send(`❌ No holdings found for wallet: \`${walletAddress}\`.`);
            }

            // Prepare response (fixing ownership count)
            const response = `✅ **Wallet:** \`${walletAddress}\`\n📦 **Solarians Owned:** ${holder.solarians.length}`;

            return context.reply
                ? await context.reply(response)
                : await context.channel.send(response);

        } catch (error) {
            console.error('Error executing my-wallet command:', error);
            const errorMessage = '⚠️ An error occurred while retrieving wallet data.';
            return context.reply
                ? await context.reply(errorMessage)
                : await context.channel.send(errorMessage);
        }
    },
};

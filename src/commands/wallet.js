const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const holdersFilePath = path.resolve(__dirname, '../../../robo-check/src/data/holders.json');
const imgDirectory = path.resolve(__dirname, '../data/img');
const mergedMintsPath = path.resolve(__dirname, '../data/merged_mints.json');

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
      if (!fs.existsSync(holdersFilePath)) {
        return await context.reply('⚠️ Holders data is not available.');
      }

      const rawData = fs.readFileSync(holdersFilePath, 'utf-8');
      const holdersData = JSON.parse(rawData);

      let walletAddress = context.options.getString('wallet');

      if (!walletAddress) {
        const userId = context.user ? context.user.id : context.author.id;
        const linkedHolder = holdersData.find(h => h.discordId === userId);
        if (linkedHolder) {
          walletAddress = linkedHolder.walletAddress;
        } else {
          return await context.reply('⚠️ No linked wallet found. Please provide your wallet address manually.');
        }
      }

      const holder = holdersData.find(h => h.walletAddress === walletAddress);

      if (!holder || !Array.isArray(holder.tokens)) {
        return await context.reply('❌ No holdings found for your wallet.');
      }

      const tokens = holder.tokens;

      if (tokens.length === 0) {
        return await context.reply('📦 No Solarians owned.');
      }

      if (!fs.existsSync(imgDirectory)) {
        return await context.reply(`📦 **Solarians Owned:** ${tokens.length}\n⚠️ Image directory is missing.`);
      }

      const availableImages = fs.readdirSync(imgDirectory);

      let mergedMints = [];
      if (fs.existsSync(mergedMintsPath)) {
        const mergedData = fs.readFileSync(mergedMintsPath, 'utf-8');
        mergedMints = JSON.parse(mergedData);
      }

      const matchingSolarians = tokens.map(({ mint }) => {
        let image = availableImages.find(img => img.startsWith(mint));
        let mintData = mergedMints.find(entry => entry.Mint === mint || entry.Entangled === mint) || null;

        if (!image && mintData) {
          image = availableImages.find(img => img.startsWith(mintData.Mint));
        }

        return image ? { mint, image, mintData } : null;
      }).filter(Boolean);

      if (matchingSolarians.length === 0) {
        return await context.reply(`📦 **Solarians Owned:** ${tokens.length}\n⚠️ No images found for these Solarians.`);
      }

      let page = 0;
      const totalPages = matchingSolarians.length;

      const generatePage = (pageIndex) => {
        const { mint, image, mintData } = matchingSolarians[pageIndex];
        const embed = new EmbedBuilder()
          .setColor(0xE69349)
          .setTitle('Solarians Wallet Summary')
          .setDescription(`📦 **Solarians Owned:** ${tokens.length}`)
          .setFooter({ text: `Solarian ${pageIndex + 1} of ${totalPages}` })
          .setImage(`attachment://${image}`);

        if (mintData?.MintNumber) {
          embed.addFields({ name: 'Mint #', value: mintData.MintNumber.toString(), inline: true });
        } else {
          embed.addFields({ name: 'Mint #', value: 'N/A', inline: true });
        }

        return { embed, image };
      };

      const { embed, image } = generatePage(page);
      const file = { attachment: path.join(imgDirectory, image), name: image };

      const uniquePrevId = `prev_${context.user.id}_${Date.now()}`;
      const uniqueNextId = `next_${context.user.id}_${Date.now()}`;

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

      const message = await context.reply({
        embeds: [embed],
        files: [file],
        components: totalPages > 1 ? [row] : []
      });

      if (totalPages <= 1) return;

      const collector = message.createMessageComponentCollector({
        filter: interaction =>
          interaction.user.id === context.user.id &&
          (interaction.customId === uniquePrevId || interaction.customId === uniqueNextId),
        time: 600000
      });

      collector.on('collect', async interaction => {
        if (interaction.customId === uniquePrevId && page > 0) page--;
        if (interaction.customId === uniqueNextId && page < totalPages - 1) page++;

        const { embed: newEmbed, image: newImage } = generatePage(page);
        const newFile = { attachment: path.join(imgDirectory, newImage), name: newImage };

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

        await interaction.update({
          embeds: [newEmbed],
          files: [newFile],
          components: [newRow]
        });
      });

    } catch (error) {
      console.error('Error executing wallet command:', error);
      await context.reply('⚠️ An error occurred while retrieving wallet data.');
    }
  }
};

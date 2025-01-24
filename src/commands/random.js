const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('random')
        .setDescription('Sends a random GIF from the collection'),
    async execute(interaction) {
        try {
            const imgDirectory = path.resolve(__dirname, '../data/img');
            const files = fs.readdirSync(imgDirectory).filter(file => file.endsWith('.gif'));

            if (files.length === 0) {
                return interaction.reply('No GIFs found in the collection.');
            }

            const randomFile = files[Math.floor(Math.random() * files.length)];
            const gifPath = path.join(imgDirectory, randomFile);

            await interaction.reply({
                files: [gifPath]
            });
        } catch (error) {
            console.error('Error executing random command:', error);
            interaction.reply('There was an error fetching a random GIF!');
        }
    },
};

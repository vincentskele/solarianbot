const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomattribute')
        .setDescription('Replies with a random attribute'),
    async execute(interaction) {
        const attributesPath = path.join(__dirname, '../data/attributes.json');
        const attributes = JSON.parse(fs.readFileSync(attributesPath, 'utf-8'));
        const randomAttribute = attributes[Math.floor(Math.random() * attributes.length)];
        await interaction.reply(`Random attribute: ${randomAttribute}`);
    },
};

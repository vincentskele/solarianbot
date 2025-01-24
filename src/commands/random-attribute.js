const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomattribute')
        .setDescription('Replies with a random attribute'),
    async execute(context) {
        const attributesPath = path.join(__dirname, '../data/attributes.json');
        const attributes = JSON.parse(fs.readFileSync(attributesPath, 'utf-8'));
        const randomAttribute = attributes[Math.floor(Math.random() * attributes.length)];

        if (context.reply) {
            // Prefix-based execution
            context.reply(`Random attribute: ${randomAttribute}`);
        } else if (context.isCommand && context.isCommand()) {
            // Slash command execution
            await context.reply(`Random attribute: ${randomAttribute}`);
        }
    },
};

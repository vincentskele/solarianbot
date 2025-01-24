const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(context) {
        if (context.reply) {
            // Prefix-based trigger
            context.reply('Pong!');
        } else {
            // Slash command trigger
            await context.reply('Pong!');
        }
    },
};

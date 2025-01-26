const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // Slash command registration data
    data: new SlashCommandBuilder()
        .setName('listattributes')
        .setDescription('Lists all attributes from the attribute list'),

    // Execution for both slash and prefix commands
    execute: async (interactionOrContext) => {
        try {
            // Load the attribute list JSON file
            const filePath = path.join(__dirname, '../data/attribute-list.json');
            const attributes = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (attributes && typeof attributes === 'object') {
                // Identify unique attribute lists to reduce repetition
                const uniqueAttributes = {};
                const categoriesByAttributes = {};

                for (const [category, items] of Object.entries(attributes)) {
                    const itemsKey = items.join(', ');
                    if (!uniqueAttributes[itemsKey]) {
                        uniqueAttributes[itemsKey] = [];
                    }
                    uniqueAttributes[itemsKey].push(category);
                }

                // Build a cleaned-up message
                let attributeMessage = '**Attributes List:**\n';
                for (const [itemsKey, categories] of Object.entries(uniqueAttributes)) {
                    attributeMessage += `**${categories.join(', ')}:** ${itemsKey}\n\n`;
                }

                // Reply based on command type
                if (interactionOrContext.reply) {
                    await interactionOrContext.reply(attributeMessage);
                } else {
                    await interactionOrContext.channel.send(attributeMessage);
                }
            } else {
                const errorMessage = 'The attribute list is empty or malformed.';
                if (interactionOrContext.reply) {
                    await interactionOrContext.reply(errorMessage);
                } else {
                    await interactionOrContext.channel.send(errorMessage);
                }
            }
        } catch (error) {
            console.error('Error loading attribute list:', error);
            const errorMessage = 'An error occurred while retrieving the attribute list.';
            if (interactionOrContext.reply) {
                await interactionOrContext.reply(errorMessage);
            } else {
                await interactionOrContext.channel.send(errorMessage);
            }
        }
    },
};

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const commands = [];

/**
 * Recursively load command files.
 * @param {string} dir Directory to search for command files.
 */
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if (command.data) {
                commands.push(command.data.toJSON());
            } else {
                console.warn(`Skipping invalid command file: ${filePath}`);
            }
        }
    }
};

// Define the path to the /src/commands directory
const commandsPath = path.join(__dirname, '../commands');
loadCommands(commandsPath);

// Initialize the Discord REST client
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands for guild.');

        // Replace YOUR_GUILD_ID with the ID of the target server
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands for guild.');
    } catch (error) {
        console.error(error);
    }
})();

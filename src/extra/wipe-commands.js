const { REST, Routes } = require('discord.js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // Optional for guild-specific commands

const rest = new REST({ version: '10' }).setToken(token);

const wipeCommands = async () => {
    try {
        // Remove guild commands (if GUILD_ID is defined)
        if (guildId) {
            console.log(`Removing all commands for guild: ${guildId}`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log('Successfully removed all guild commands.');
        }

        // Remove global commands
        console.log('Removing all global commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('Successfully removed all global commands.');
    } catch (error) {
        console.error('Error wiping commands:', error);
    }
};

wipeCommands();

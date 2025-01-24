const { Client, GatewayIntentBits, Collection } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

// Initialize Discord bot client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Create a collection to store commands
client.commands = new Collection();

/**
 * Recursively load commands from the commands directory.
 * @param {string} dir Path to commands directory.
 */
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath); // Recursively load nested directories
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if (command.data && typeof command.execute === 'function') {
                client.commands.set(command.data.name, command); // Store the command
            } else {
                console.warn(`Skipping invalid command file: ${filePath}`);
            }
        }
    }
};

// Load all commands from the commands directory
loadCommands(path.join(__dirname, 'commands'));

// Event: Bot ready
client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

// Event: Interaction created (Slash Commands)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction); // Execute the command
    } catch (error) {
        console.error(`Error executing command: ${interaction.commandName}`, error);
        await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
        });
    }
});

// Log in to Discord with the bot token
client.login(process.env.DISCORD_TOKEN);

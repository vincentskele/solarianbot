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
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if (command.name && typeof command.execute === 'function') {
                client.commands.set(command.name, command);
            } else {
                console.warn(`Skipping invalid command file: ${filePath}`);
            }
        }
    }
};

// Load all commands
loadCommands(path.join(__dirname, 'commands'));

// Event: Bot ready
client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

// Event: Message received
client.on('messageCreate', (message) => {
    if (!message.content.startsWith(process.env.PREFIX) || message.author.bot) return;

    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(`Error executing command: ${commandName}`, error);
        message.reply('There was an error executing that command!');
    }
});

// Log in to Discord with the bot token
client.login(process.env.DISCORD_TOKEN);


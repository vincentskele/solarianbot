const { Client, GatewayIntentBits, Collection } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

console.log('Loaded prefix:', process.env.PREFIX);

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

// Event: Slash Command Interaction
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

// Event: Message-based Commands
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(process.env.PREFIX) || message.author.bot) return;

    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        await command.execute({
            reply: (content) => message.channel.send(content),
            channel: message.channel,
            author: message.author,
            args,
        });
    } catch (error) {
        console.error(`Error executing command: ${commandName}`, error);
        message.channel.send('There was an error while executing that command!');
    }
});

// Log in to Discord with the bot token
client.login(process.env.DISCORD_TOKEN);

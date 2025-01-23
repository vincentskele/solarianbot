const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const PREFIX = process.env.PREFIX;

client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

client.on('messageCreate', (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') {
        message.channel.send('Pong!');
    }
});

client.login(process.env.DISCORD_TOKEN);

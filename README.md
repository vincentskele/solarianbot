# SolarianBot

SolarianBot is a Discord bot designed by RoboDAO for RoboDAO, aiming to provide robust tools for interacting with the Solarians NFT collection. Commands can be called with a prefix defined in .env or with / .

## Features

Currently implemented:
- Responds to `ping` with `Pong!` to confirm the bot is online.
- Responds to `random` with a random Solarian GIF.
- Responds to `view <MINT #>` with the Solarian's GIF and metadata.
- Responds to `randomattibute` with a random attribute and an example of a Solarian with the attribute.


## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- A Discord bot token (from the [Discord Developer Portal](https://discord.com/developers/applications))

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vincentskele/solarianbot.git
   cd solarianbot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the bot**:
   ```bash
   cp .env.example .env
   ```

4. **Run the bot**:
   ```bash
   npm start
   ```

### Usage

- Use `!ping` in any channel the bot has access to, and it will respond with `Pong!`.


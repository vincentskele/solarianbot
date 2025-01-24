const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'randomatt',
    description: 'Sends a random attribute from the collection.',
    execute(message) {
        const attributesPath = path.join(__dirname, '../data/attributes.json');
        const attributes = JSON.parse(fs.readFileSync(attributesPath, 'utf-8'));
        const randomAttribute = attributes[Math.floor(Math.random() * attributes.length)];
        message.channel.send(`Random attribute: ${randomAttribute}`);
    },
};

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/entangled.json');
const rawData = fs.readFileSync(filePath, 'utf-8');

try {
    // Auto-format the file
    const formattedData = rawData
        .trim()
        .split('\n') // Split into lines
        .map(line => {
            const parts = line.trim().split(','); // Split line by comma
            if (parts.length === 2) {
                const key = parts[0].trim();
                const value = parts[1].trim();
                return `"${key}": "${value}"`;
            } else {
                console.warn(`Skipping invalid line: ${line}`);
                return null; // Skip invalid lines
            }
        })
        .filter(line => line !== null) // Remove skipped lines
        .join(',\n');

    // Wrap everything in curly braces
    const finalJSON = `{\n${formattedData}\n}`;

    // Save the formatted file
    fs.writeFileSync(filePath, finalJSON, 'utf-8');
    console.log('File successfully formatted!');
} catch (error) {
    console.error('Error formatting the file:', error.message);
}

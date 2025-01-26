const fs = require('fs');
const path = require('path');

// Input and output paths
const inputPath = path.join(__dirname, '../data/attributes.json');
const outputPath = path.join(__dirname, '../data/unique-attributes.json');

// Load and parse the input JSON file
let metadata;
try {
  const fileContents = fs.readFileSync(inputPath, 'utf8');
  metadata = JSON.parse(fileContents);
} catch (error) {
  console.error(`Error reading or parsing the input file at ${inputPath}:`, error);
  process.exit(1);
}

// List of trait types to exclude
const excludeTraits = [
  "Title",
  "Level",
  "Luck",
  "Average Rarity",
  "Ranking #",
  "Mint #"
];

// Collect unique attributes
const uniqueAttributes = {};

metadata.forEach((item) => {
  item.attributes.forEach((attribute) => {
    const { trait_type, value } = attribute;
    if (!excludeTraits.includes(trait_type)) {
      if (!uniqueAttributes[trait_type]) {
        uniqueAttributes[trait_type] = new Set();
      }
      uniqueAttributes[trait_type].add(value);
    }
  });
});

// Convert sets to arrays for JSON serialization
const result = {};
for (const trait in uniqueAttributes) {
  result[trait] = Array.from(uniqueAttributes[trait]);
}

// Save to JSON
try {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Unique attributes saved to ${outputPath}`);
} catch (error) {
  console.error(`Error saving the output file at ${outputPath}:`, error);
}

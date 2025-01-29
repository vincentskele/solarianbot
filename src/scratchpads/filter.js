//filters name and mint time from raw api data

const fs = require('fs');

fs.readFile('solarians_mints.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    
    const jsonData = JSON.parse(data);
    
    const filteredData = jsonData.map(item => {
        return {
            MintNumber: item.MintNumber,
            Created: item.Created,
            Name: `${item.Parts["text/name"].Value} the ${item.Parts["text/adjective"].Value}`
        };
    });
    
    fs.writeFile('filtered_mints.json', JSON.stringify(filteredData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('Filtered data saved to filtered_mints.json');
    });
});

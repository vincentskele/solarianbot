const fs = require('fs');

// 1) Read solarians_mints.json
fs.readFile('solarians_mints.json', 'utf8', (err, filteredData) => {
    if (err) {
        console.error('Error reading solarians_mints.json:', err);
        return;
    }
    
    // 2) Read attributes.json
    fs.readFile('attributes.json', 'utf8', (err, attributesData) => {
        if (err) {
            console.error('Error reading attributes.json:', err);
            return;
        }
        
        // 3) Read name_creation.json
        fs.readFile('name_creation.json', 'utf8', (err, nameData) => {
            if (err) {
                console.error('Error reading name_creation.json:', err);
                return;
            }
            
            // Parse the loaded JSON
            const filteredJson = JSON.parse(filteredData);   // from solarians_mints.json
            const attributesJson = JSON.parse(attributesData); // from attributes.json
            const nameJson = JSON.parse(nameData);          // from name_creation.json
            
            // Merge the data
            const mergedData = filteredJson.map(filteredItem => {
                // Find matching attributes by MintNumber
                const matchingAttributes = attributesJson.find(attrItem => 
                    attrItem.attributes.some(attr =>
                        attr.trait_type === 'Mint #' &&
                        parseInt(attr.value, 10) === filteredItem.MintNumber
                    )
                );

                // Find matching name entry by MintNumber
                const matchingName = nameJson.find(nameItem => 
                    nameItem.MintNumber === filteredItem.MintNumber
                );

                // Return a merged object
                return {
                    // Basic info from solarians_mints.json
                    MintNumber: filteredItem.MintNumber,
                    Mint: filteredItem.Mint,           // <--- Include the mint from solarians_mints.json
                    Entangled: filteredItem.Entangled, // <--- Include the entangled mint if any
                    Created: filteredItem.Created,

                    // If name_creation.json has a Name, use it; otherwise fallback
                    Name: matchingName ? matchingName.Name : filteredItem.Name,

                    // If attributes.json found a matching entry, use its attributes
                    Attributes: matchingAttributes ? matchingAttributes.attributes : []
                };
            });
            
            // Write merged output to merged_mints.json
            fs.writeFile('merged_mints.json', JSON.stringify(mergedData, null, 2), 'utf8', err => {
                if (err) {
                    console.error('Error writing merged_mints.json:', err);
                    return;
                }
                console.log('Merged data saved to merged_mints.json');
            });
        });
    });
});

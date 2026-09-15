import fs from 'fs';

const localPath = 'scratch/merged_app_data.json';
const data = JSON.parse(fs.readFileSync(localPath, 'utf8'));
const projects = data.fields.projects.arrayValue.values || [];

console.log("🔍 Checking Projects in merged_app_data.json:");
projects.forEach((p, i) => {
    const f = p.mapValue.fields;
    const name = f.name.stringValue;
    console.log(`\n[${i}] Project: ${name}`);
    console.log(`    Fields: ${Object.keys(f).join(', ')}`);
    
    // Check inventory
    if (f.inventory) {
        console.log(`    - inventory type: ${f.inventory.arrayValue ? 'Array' : 'Other'}`);
        if (f.inventory.arrayValue) {
            console.log(`    - inventory count: ${f.inventory.arrayValue.values?.length || 0}`);
        }
    } else {
        console.log(`    - NO inventory field`);
    }

    // Check budget
    if (f.budget) {
        console.log(`    - budget sections count: ${f.budget.mapValue?.fields?.sections?.arrayValue?.values?.length || 0}`);
    } else {
        console.log(`    - NO budget field`);
    }

    // Check budgetItems (just in case)
    if (f.budgetItems) {
        console.log(`    - budgetItems count: ${f.budgetItems.arrayValue?.values?.length || 0}`);
    }
});

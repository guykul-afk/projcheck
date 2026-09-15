import fs from 'fs';

const localPath = 'scratch/merged_app_data.json';
const data = JSON.parse(fs.readFileSync(localPath, 'utf8'));
const projects = data.fields.projects.arrayValue.values || [];

console.log("🔍 Robust Verification of Project Data (Local File):");
console.log("===============================================");

projects.forEach((p, i) => {
    const f = p.mapValue.fields;
    const name = f.name.stringValue;
    console.log(`\nProject [${i}]: ${name}`);

    // Check Inventory
    const inventoryField = f.inventory || f.inventoryData;
    if (inventoryField) {
        let count = 0;
        if (inventoryField.arrayValue) count = inventoryField.arrayValue.values?.length || 0;
        else if (inventoryField.mapValue) count = 1; // Singular map?
        console.log(`- Inventory: ${count} units (${f.inventory ? 'inventory' : 'inventoryData'})`);
    } else {
        console.log(`- Inventory: MISSING`);
    }

    // Check Budget
    const budgetField = f.budget || f.budgetData;
    if (budgetField) {
        let count = 0;
        if (budgetField.mapValue && budgetField.mapValue.fields.sections) {
            count = budgetField.mapValue.fields.sections.arrayValue?.values?.length || 0;
            console.log(`- Budget Sections: ${count} (${f.budget ? 'budget' : 'budgetData'})`);
        } else if (budgetField.arrayValue) {
            count = budgetField.arrayValue.values?.length || 0;
            console.log(`- Budget Items: ${count} (${f.budget ? 'budget' : 'budgetData'})`);
        } else {
             console.log(`- Budget: Present but unknown structure`);
        }
    } else {
        console.log(`- Budget: MISSING`);
    }
    
    console.log(`- Analysis Result: ${!!f.analysisResult ? 'YES' : 'NO'}`);
});

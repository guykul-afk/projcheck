import fs from 'fs';

const prodPath = 'C:/Users/guyku/.gemini/antigravity/brain/51731042-8102-4e6b-8d4c-30644a1f44b1/.system_generated/steps/1302/output.txt';
const prodData = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
const projects = prodData.fields.projects.arrayValue.values || [];

const targetProjects = ['חפץ חיים 44', 'משה שרת 26-28', 'משה שרת דופלקסים', 'פינס 48'];

console.log("🔍 Detailed Verification for Specific Projects:");
console.log("===============================================");

targetProjects.forEach(targetName => {
    const project = projects.find(p => p.mapValue.fields.name.stringValue === targetName);
    if (project) {
        const f = project.mapValue.fields;
        console.log(`\nProject: ${targetName}`);
        console.log(`- Address: ${f.address?.stringValue || 'N/A'}`);
        console.log(`- Inventory Count: ${f.inventory?.arrayValue?.values?.length || 0} units`);
        console.log(`- Budget Items Count: ${f.budgetItems?.arrayValue?.values?.length || 0} items`);
        console.log(`- Has Analysis Result: ${!!f.analysisResult}`);
        if (f.analysisResult) {
            console.log(`  - Last Scan: ${f.analysisResult.mapValue.fields.lastScan?.stringValue || 'N/A'}`);
        }
    } else {
        console.log(`\n❌ Project NOT FOUND: ${targetName}`);
    }
});

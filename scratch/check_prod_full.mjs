import fs from 'fs';

const prodPath = 'C:/Users/guyku/.gemini/antigravity/brain/51731042-8102-4e6b-8d4c-30644a1f44b1/.system_generated/steps/1210/output.txt';
const prodData = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
const prodProjects = prodData.fields.projects.arrayValue.values || [];

prodProjects.forEach((p, i) => {
    const fields = p.mapValue.fields;
    const name = fields.name?.stringValue || 'Unknown';
    const hasAnalysis = !!fields.analysisResult;
    console.log(`Project ${i}: ${name} - Has analysisResult: ${hasAnalysis}`);
    if (hasAnalysis) {
        console.log(`  Analysis result fields: ${Object.keys(fields.analysisResult.mapValue.fields).join(', ')}`);
    }
});

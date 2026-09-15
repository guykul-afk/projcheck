import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/merged_app_data.json', 'utf8'));
const projects = data.fields.projects.arrayValue.values;

projects.forEach((p, i) => {
    const fields = p.mapValue.fields;
    const name = fields.name?.stringValue || 'Unknown';
    const hasAnalysis = !!fields.analysisResult;
    console.log(`Project ${i}: ${name} - Has analysisResult: ${hasAnalysis}`);
});

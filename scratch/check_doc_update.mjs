import fs from 'fs';

try {
    const data = JSON.parse(fs.readFileSync('doc_update.json', 'utf8'));
    const projects = data.fields.projects.arrayValue.values;

    projects.forEach((p, i) => {
        const fields = p.mapValue.fields;
        const name = fields.name?.stringValue || 'Unknown';
        const hasAnalysis = !!fields.analysisResult;
        console.log(`Project ${i}: ${name} - Has analysisResult: ${hasAnalysis}`);
    });
} catch (e) {
    console.error("Error checking doc_update.json:", e.message);
}

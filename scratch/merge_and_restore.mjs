import fs from 'fs';

const localPath = 'scratch/merged_app_data.json';
const prodPath = 'C:/Users/guyku/.gemini/antigravity/brain/51731042-8102-4e6b-8d4c-30644a1f44b1/.system_generated/steps/1210/output.txt';
const restoredDataPath = 'src/RestoredData.json';

// Utility to convert Firestore JSON to regular JSON
function firestoreToRegular(value) {
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.arrayValue) {
        return (value.arrayValue.values || []).map(firestoreToRegular);
    }
    if (value.mapValue) {
        const result = {};
        const fields = value.mapValue.fields || {};
        for (const key in fields) {
            result[key] = firestoreToRegular(fields[key]);
        }
        return result;
    }
    return null;
}

// 1. Load data
console.log("📂 Loading data...");
const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
const prodData = JSON.parse(fs.readFileSync(prodPath, 'utf8'));

const localProjects = localData.fields.projects.arrayValue.values || [];
const prodProjects = prodData.fields.projects.arrayValue.values || [];

// 2. Build map of production analysis results
const prodAnalysisMap = new Map();
prodProjects.forEach(p => {
    const fields = p.mapValue.fields;
    const name = fields.name.stringValue;
    if (fields.analysisResult) {
        prodAnalysisMap.set(name, fields.analysisResult);
    }
});

// 3. Merge analysis into local projects
console.log("🔄 Merging analysis results...");
let mergedCount = 0;
localProjects.forEach(p => {
    const fields = p.mapValue.fields;
    const name = fields.name.stringValue;
    if (prodAnalysisMap.has(name) && !fields.analysisResult) {
        fields.analysisResult = prodAnalysisMap.get(name);
        mergedCount++;
        console.log(` ✅ Added analysisResult to project: ${name}`);
    } else if (prodAnalysisMap.has(name) && fields.analysisResult) {
        console.log(` ℹ️ Project ${name} already has analysisResult, skipping merge.`);
    }
});

// 4. Save updated Firestore-ready JSON
fs.writeFileSync(localPath, JSON.stringify(localData, null, 2));
console.log(`💾 Updated ${localPath} with ${mergedCount} restored analysis results.`);

// 5. Generate regular JSON for RestoredData.json
console.log("🧪 Generating RestoredData.json...");
const restoredData = firestoreToRegular({ mapValue: localData }).projects; // The current file root is the Doc itself
// Wait, the Firestore JSON we have is the document object. firestoreToRegular(localData) would work if nested correctly.
const fullRegularData = firestoreToRegular({ mapValue: localData });

fs.writeFileSync(restoredDataPath, JSON.stringify(fullRegularData, null, 2));
console.log(`💾 Updated ${restoredDataPath}`);

import fs from 'fs';

const sourcePath = 'C:/Users/guyku/.gemini/antigravity/brain/d50ac071-6be7-4115-9d08-866a7145159b/.system_generated/steps/1334/output.txt';
const destPath = 'C:/Users/guyku/.gemini/antigravity/brain/d50ac071-6be7-4115-9d08-866a7145159b/.system_generated/steps/1346/output.txt';

const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const destData = JSON.parse(fs.readFileSync(destPath, 'utf8'));

const sourceProjects = sourceData.fields.projects.arrayValue.values || [];
const destProjects = destData.fields.projects.arrayValue.values || [];

// Map to identify unique projects by name or ID to avoid exact duplicates
const projectMap = new Map();

// Add existing projects to map
destProjects.forEach(p => {
    const name = p.mapValue.fields.name.stringValue;
    projectMap.set(name, p);
});

// Add source projects (overwrite if name exists, or just append)
// The user explicitly wants "all projects", so I'll append but maybe keep unique names if they are exactly the same.
// Actually, I'll just append them all because they might have different data.
// But wait, "קק"ל 10" in source might be better than whatever is in dest.
// I'll prioritize source projects for the requested names.

sourceProjects.forEach(p => {
    const name = p.mapValue.fields.name.stringValue;
    // If it's one of the requested ones, or if it doesn't exist, add it.
    projectMap.set(name, p);
});

const mergedProjects = Array.from(projectMap.values());

// Update destination data
destData.fields.projects.arrayValue.values = mergedProjects;

// Clean up document metadata for update (remove createTime, etc. if needed, but get_document output is slightly different)
// The firestore_update_document tool expects the document object.
delete destData.createTime;
delete destData.updateTime;
delete destData.name;

fs.writeFileSync('C:/Users/guyku/projectcheck/scratch/merged_app_data.json', JSON.stringify(destData, null, 2));
console.log(`Merged ${sourceProjects.length} source projects into ${destProjects.length} existing projects. Total: ${mergedProjects.length}`);

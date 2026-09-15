import fs from 'fs';

const localPath = 'scratch/merged_app_data.json';
const prodPath = 'C:/Users/guyku/.gemini/antigravity/brain/51731042-8102-4e6b-8d4c-30644a1f44b1/.system_generated/steps/1210/output.txt';

const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
const prodData = JSON.parse(fs.readFileSync(prodPath, 'utf8'));

const localProjects = localData.fields.projects.arrayValue.values || [];
const prodProjects = prodData.fields.projects.arrayValue.values || [];

const localProjectNames = localProjects.map(p => p.mapValue.fields.name.stringValue);
const prodProjectNames = prodProjects.map(p => p.mapValue.fields.name.stringValue);

console.log("Local Project Names:", localProjectNames);
console.log("Prod Project Names:", prodProjectNames);

const projectsWithAnalysis = prodProjects.filter(p => p.mapValue.fields.analysisResult).map(p => p.mapValue.fields.name.stringValue);
console.log("Prod projects with analysisResult:", projectsWithAnalysis);

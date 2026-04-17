import fs from 'fs';

const data = JSON.parse(fs.readFileSync('C:/Users/guyku/.gemini/antigravity/brain/d50ac071-6be7-4115-9d08-866a7145159b/.system_generated/steps/1169/output.txt', 'utf8'));

const projects = data.fields.projects.arrayValue.values;

projects.forEach((v, i) => {
  const fields = v.mapValue.fields;
  const name = fields.name ? fields.name.stringValue : 'No Name';
  console.log(`Project ${i}: ${name}`);
});

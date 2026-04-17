const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\guyku\\.gemini\\antigravity\\brain\\d50ac071-6be7-4115-9d08-866a7145159b\\scratch\\merged_fields.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log(JSON.stringify(data.projects, null, 2));

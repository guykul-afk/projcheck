import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:/Users/guyku/projectcheck/scratch/merged_app_data.json', 'utf8'));
fs.writeFileSync('C:/Users/guyku/projectcheck/scratch/merged_app_data_min.json', JSON.stringify(data));
console.log('Original length:', fs.readFileSync('C:/Users/guyku/projectcheck/scratch/merged_app_data.json', 'utf8').length);
console.log('Minified length:', fs.readFileSync('C:/Users/guyku/projectcheck/scratch/merged_app_data_min.json', 'utf8').length);

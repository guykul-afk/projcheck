const fs = require('fs');
const rawData = JSON.parse(fs.readFileSync('C:/Users/guyku/projectcheck/src/historical_data.json', 'utf8'));
// (I will first copy the output.txt content to historical_data.json)
const docUpdate = {
  fields: rawData.fields
};
fs.writeFileSync('doc_update.json', JSON.stringify(docUpdate, null, 2));

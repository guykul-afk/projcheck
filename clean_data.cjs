const fs = require('fs');

function unwrap(val) {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue);
  if (val.doubleValue !== undefined) return parseFloat(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.arrayValue !== undefined) {
    return (val.arrayValue.values || []).map(unwrap);
  }
  if (val.mapValue !== undefined) {
    const res = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = unwrap(v);
    }
    return res;
  }
  if (val.timestampValue !== undefined) return val.timestampValue;
  return null;
}

try {
  const rawData = JSON.parse(fs.readFileSync('C:/Users/guyku/.gemini/antigravity/brain/e026b4f5-016f-4fb1-b04d-e36a7019bdbc/.system_generated/steps/510/output.txt', 'utf8'));
  const cleaned = {};
  for (const [k, v] of Object.entries(rawData.fields)) {
    cleaned[k] = unwrap(v);
  }
  
  // Also need to handle projects array correctly
  // cleaned.projects is now an array of objects
  
  fs.writeFileSync('cleaned_data.json', JSON.stringify(cleaned, null, 2));
  console.log('Successfully cleaned data to cleaned_data.json');
} catch (err) {
  console.error('Error parsing historical data:', err);
}

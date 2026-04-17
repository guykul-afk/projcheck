import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('./src/RestoredData.json', 'utf8'));

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

const fields = {};
for (const [key, value] of Object.entries(data)) {
  fields[key] = toFirestoreValue(value);
}

writeFileSync('firestore_fields.json', JSON.stringify({ fields }, null, 2));
console.log('Done');

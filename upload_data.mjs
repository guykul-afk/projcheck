/**
 * upload_data.mjs
 * Uploads RestoredData.json to Firestore using the Firebase REST API.
 * Uses the Google Identity Token from the Firebase CLI credentials.
 * Run: node upload_data.mjs
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const PROJECT_ID = 'projectcheck-app';
const USER_ID = 'V0gUanSFkNgGzRBsa1GE3CRSpXn2';
const DOC_PATH = `projects/${PROJECT_ID}/databases/(default)/documents/users/${USER_ID}/data/app`;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;

// Load data
const data = JSON.parse(readFileSync('./src/RestoredData.json', 'utf8'));

console.log(`📦 Loaded ${data.projects?.length} projects from RestoredData.json`);
data.projects?.forEach(p => console.log(`   → ${p.name} (${p.inventoryData?.length ?? 0} units)`));

// Get access token from gcloud / firebase CLI
let token;
try {
  token = execSync('npx firebase-tools exec --project projectcheck-app -- gcloud auth print-access-token 2>&1', { encoding: 'utf8' }).trim();
} catch (e1) {
  try {
    token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  } catch (e2) {
    // Try reading firebase CLI token from cache
    const os = await import('os');
    const path = await import('path');
    const tokenFile = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
    try {
      const cache = JSON.parse(readFileSync(tokenFile, 'utf8'));
      // Look for tokens object
      const tokens = cache?.tokens;
      if (tokens?.access_token) {
        token = tokens.access_token;
      } else {
        // Try users section
        const users = cache?.users;
        if (users) {
          const firstUser = Object.values(users)[0];
          token = firstUser?.tokens?.access_token;
        }
      }
    } catch (e3) {}
  }
}

if (!token || token.includes('ERROR') || token.length < 50) {
  console.error('❌ Could not get access token. Trying alternative approach...');
  // Try via firebase admin emulator or direct fetch
  console.log('\n💡 Alternative: Using Firebase Firestore REST API with API key...');
  await uploadWithApiKey();
} else {
  console.log('✅ Got access token');
  await uploadWithToken(token);
}

async function toFirestoreValue(val) {
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
        values: await Promise.all(val.map(toFirestoreValue))
      }
    };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = await toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function buildFirestoreDoc(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = await toFirestoreValue(value);
  }
  return { fields };
}

async function uploadWithToken(accessToken) {
  console.log('\n🚀 Uploading to Firestore...');
  const doc = await buildFirestoreDoc(data);
  
  const response = await fetch(FIRESTORE_URL + '?updateMask.fieldPaths=projects&updateMask.fieldPaths=activeProjectId&updateMask.fieldPaths=activeTab', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(doc)
  });
  
  if (response.ok) {
    console.log('✅ Data uploaded successfully!');
    const result = await response.json();
    console.log(`   Document updated at: ${result.updateTime}`);
  } else {
    const err = await response.text();
    console.error(`❌ Failed: ${response.status} ${response.statusText}`);
    console.error(err.substring(0, 500));
  }
}

async function uploadWithApiKey() {
  // This uses the web API key - but it requires auth. Let's use the emulator approach
  console.log('⚠️  API key approach requires authentication. Please use the browser method instead.');
  console.log('\n📋 Manual steps:');
  console.log('1. Open http://localhost:5600/');
  console.log('2. Click "שחזר נתונים מגרסה קודמת" button');
  console.log('3. Click OK on the alert');
  console.log('4. Click "שמירה" button');
  process.exit(1);
}

/**
 * push_merged.mjs
 * Pushes merged_app_data.json (pre-formatted for Firestore) to production.
 * Uses tokens from Firebase CLI cache.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';

const PROJECT_ID = 'projectcheck-app';
const USER_ID = 'V0gUanSFkNgGzRBsa1GE3CRSpXn2';
const DOC_PATH = `projects/${PROJECT_ID}/databases/(default)/documents/users/${USER_ID}/data/app`;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;

// Load pre-formatted data
const data = JSON.parse(readFileSync('scratch/merged_app_data.json', 'utf8'));

console.log(`🚀 Preparing to push merged data for user ${USER_ID}`);
console.log(`📦 Data contains: ${data.fields.projects.arrayValue.values.length} projects`);

// Get access token
let token;
try {
  // Try reading from configstore
  const tokenFile = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const cache = JSON.parse(readFileSync(tokenFile, 'utf8'));
  const tokens = cache?.tokens;
  if (tokens?.access_token) {
    token = tokens.access_token;
  } else {
    // Try user section
    const users = cache?.users;
    if (users) {
      const firstUser = Object.values(users)[0];
      token = firstUser?.tokens?.access_token;
    }
  }
} catch (e) {
  console.log('⚠️  Could not read token from file, trying npx...');
}

if (!token) {
  try {
    token = execSync('npx firebase-tools login:get-token', { encoding: 'utf8' }).trim();
    // This command might not exist or might return a different format. 
    // Let's try to get a one-off token if possible.
  } catch (e) {
    console.error('❌ Could not get access token.');
    process.exit(1);
  }
}

if (!token || token.includes('ERROR')) {
  console.error('❌ Invalid token.');
  process.exit(1);
}

console.log('✅ Got access token');

async function upload() {
  console.log('🚀 Uploading to Firestore...');
  
  // Note: the file already has { fields: { ... } } structure
  const response = await fetch(FIRESTORE_URL + '?updateMask.fieldPaths=projects&updateMask.fieldPaths=activeProjectId&updateMask.fieldPaths=activeTab&updateMask.fieldPaths=updatedAt', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (response.ok) {
    console.log('✅ Data uploaded successfully!');
    const result = await response.json();
    console.log(`   Document updated at: ${result.updateTime}`);
  } else {
    const err = await response.text();
    console.error(`❌ Failed: ${response.status} ${response.statusText}`);
    try {
      const parsedErr = JSON.parse(err);
      console.error(JSON.stringify(parsedErr, null, 2));
    } catch (e) {
      console.error(err.substring(0, 1000));
    }
    process.exit(1);
  }
}

upload();

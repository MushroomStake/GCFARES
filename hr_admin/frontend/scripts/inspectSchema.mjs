/**
 * Inspects all Firestore collections and prints a full schema report.
 * Run:  node scripts/inspectSchema.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyB77ryKtsEf0sLYrSn3dcwuud5Ud-VBwtE",
  authDomain:        "gcfares-6bf1e.firebaseapp.com",
  projectId:         "gcfares-6bf1e",
  storageBucket:     "gcfares-6bf1e.firebasestorage.app",
  messagingSenderId: "91039015169",
  appId:             "1:91039015169:web:846d32cc5776c026ed7b00",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── helpers ──────────────────────────────────────────────────

function getType(value) {
  if (value === null)            return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0)      return 'array<unknown>';
    const inner = getType(value[0]);
    return `array<${inner}>`;
  }
  if (value && typeof value === 'object' && value.constructor?.name === 'Timestamp')
    return 'Timestamp';
  if (typeof value === 'object') return `object{${Object.keys(value).join(', ')}}`;
  return typeof value;
}

function mergeSchema(existing, newFields) {
  const merged = { ...existing };
  for (const [k, v] of Object.entries(newFields)) {
    const t = getType(v);
    if (!merged[k]) {
      merged[k] = new Set([t]);
    } else {
      merged[k].add(t);
    }
  }
  return merged;
}

// Known top-level collections to inspect
// (Firestore REST API would need OAuth; we list them manually + auto-discover via getDocs)
const KNOWN_COLLECTIONS = [
  'users',
  'faculty',
  'evaluations',
  'submissions',
  'cycles',
  'rankings',
  'departments',
  'criteria',
  'forms',
  'evaluationForms',
];

// ── main ─────────────────────────────────────────────────────

const report = {}; // collectionName -> { schema, sampleCount, sampleIds }

for (const colName of KNOWN_COLLECTIONS) {
  try {
    const snap = await getDocs(collection(db, colName));
    if (snap.empty) continue;

    let schema = {};
    const sampleIds = [];

    snap.forEach(docSnap => {
      schema = mergeSchema(schema, docSnap.data());
      if (sampleIds.length < 3) sampleIds.push(docSnap.id);
    });

    report[colName] = { schema, count: snap.size, sampleIds };
    console.log(`✅  Found collection: "${colName}" (${snap.size} docs)`);
  } catch (err) {
    // collection doesn't exist or no permission — skip silently
  }
}

// ── print schema ─────────────────────────────────────────────

console.log('\n\n══════════════════════════════════════════════════');
console.log('  FIRESTORE SCHEMA REPORT');
console.log('══════════════════════════════════════════════════\n');

for (const [colName, { schema, count, sampleIds }] of Object.entries(report)) {
  console.log(`Collection: ${colName}  (${count} documents)`);
  console.log(`Sample IDs: ${sampleIds.join(', ')}`);
  console.log('Fields:');
  for (const [field, types] of Object.entries(schema)) {
    console.log(`  ${field.padEnd(28)} ${[...types].join(' | ')}`);
  }
  console.log();
}

if (Object.keys(report).length === 0) {
  console.log('⚠️  No collections found. Check Firestore rules or collection names.');
}

process.exit(0);

/**
 * Deep Firestore schema inspector.
 * - Scans all known top-level collections
 * - Samples up to 10 docs per collection to union all field shapes
 * - Detects subcollections on sampled documents
 * - Prints a full report then writes SCHEMA.md
 *
 * Run:  node scripts/inspectFullSchema.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  collectionGroup,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import { writeFileSync } from 'fs';

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

// ── All collection names to probe ────────────────────────────
// Add more here if you create new collections later.
const TOP_LEVEL_COLLECTIONS = [
  'users',
  'faculty',
  'admins',
  'cycles',
  'evaluationCycles',
  'semesters',
  'evaluations',
  'evaluationForms',
  'forms',
  'submissions',
  'rankings',
  'rankingResults',
  'departments',
  'criteria',
  'criteriaGroups',
  'rubrics',
  'notifications',
  'logs',
  'settings',
  'config',
];

// Subcollection names to probe on each document
const SUBCOLLECTION_NAMES = [
  'evaluations',
  'submissions',
  'scores',
  'criteria',
  'rankings',
  'history',
  'logs',
  'forms',
  'responses',
];

// ── Helpers ──────────────────────────────────────────────────

function jsType(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array<unknown>';
    const sample = value[0];
    if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
      const keys = Object.keys(sample).join(', ');
      return `array<{ ${keys} }>`;
    }
    return `array<${jsType(sample)}>`;
  }
  const ctor = value?.constructor?.name;
  if (ctor === 'Timestamp') return 'Timestamp';
  if (ctor === 'DocumentReference') return 'DocumentReference';
  if (ctor === 'GeoPoint') return 'GeoPoint';
  if (typeof value === 'object') {
    const keys = Object.keys(value).join(', ');
    return `object{ ${keys} }`;
  }
  return typeof value;
}

function mergeSchema(schema, data) {
  for (const [k, v] of Object.entries(data)) {
    const t = jsType(v);
    if (!schema[k]) schema[k] = new Set();
    schema[k].add(t);
  }
  return schema;
}

async function probeCollection(colPath) {
  try {
    const ref  = collection(db, colPath);
    const snap = await getDocs(query(ref, limit(10)));
    if (snap.empty) return null;

    let schema = {};
    const sampleIds = [];
    const sampleData = [];

    snap.forEach(d => {
      mergeSchema(schema, d.data());
      if (sampleIds.length < 3) {
        sampleIds.push(d.id);
        sampleData.push(d);
      }
    });

    // Probe subcollections on first 2 docs
    const subcollections = {};
    for (const docSnap of sampleData.slice(0, 2)) {
      for (const subName of SUBCOLLECTION_NAMES) {
        const subPath = `${colPath}/${docSnap.id}/${subName}`;
        const result  = await probeCollection(subPath);
        if (result) subcollections[subName] = result;
      }
    }

    return { count: snap.size, schema, sampleIds, subcollections };
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────

console.log('🔍  Scanning Firestore collections…\n');

const found = {};

for (const colName of TOP_LEVEL_COLLECTIONS) {
  const result = await probeCollection(colName);
  if (result) {
    found[colName] = result;
    console.log(`✅  ${colName.padEnd(24)} ${result.count} doc(s)   fields: ${Object.keys(result.schema).join(', ')}`);
    for (const [sub, subResult] of Object.entries(result.subcollections)) {
      console.log(`   └─ ${sub.padEnd(20)} ${subResult.count} doc(s)   fields: ${Object.keys(subResult.schema).join(', ')}`);
    }
  }
}

if (Object.keys(found).length === 0) {
  console.log('\n⚠️  No collections found.');
  process.exit(0);
}

// ── Build SCHEMA.md ──────────────────────────────────────────

function schemaToMarkdown(name, { count, schema, sampleIds, subcollections }, depth = 0) {
  const hashes = depth === 0 ? '##' : '###';
  const prefix = depth === 0 ? '' : `(subcollection of parent doc) `;
  let md = '';
  md += `${hashes} Collection: \`${name}\`\n\n`;
  md += `${prefix}**${count}** document(s) sampled.  \n`;
  md += `Sample IDs: \`${sampleIds.join('`, `')}\`\n\n`;
  md += `| Field | Type(s) | Notes |\n`;
  md += `|---|---|---|\n`;

  for (const [field, types] of Object.entries(schema)) {
    const typeStr = [...types].join(' \\| ');
    md += `| \`${field}\` | \`${typeStr}\` | |\n`;
  }
  md += '\n';

  for (const [subName, subResult] of Object.entries(subcollections)) {
    md += schemaToMarkdown(subName, subResult, depth + 1);
  }

  return md;
}

const now = new Date().toISOString().slice(0, 10);

let md = `# Firestore Database Schema\n\n`;
md += `> Auto-generated on **${now}** by \`scripts/inspectFullSchema.mjs\`.\n`;
md += `> Re-run the script any time new collections are added.\n\n`;
md += `---\n\n`;
md += `## Collections Found\n\n`;
md += `| Collection | Docs Sampled | Top-level Fields |\n`;
md += `|---|---|---|\n`;
for (const [name, { count, schema }] of Object.entries(found)) {
  md += `| \`${name}\` | ${count} | ${Object.keys(schema).map(f => `\`${f}\``).join(', ')} |\n`;
}
md += `\n---\n\n`;

for (const [name, result] of Object.entries(found)) {
  md += schemaToMarkdown(name, result);
  md += `---\n\n`;
}

md += `## Field Name Quick-Reference\n\n`;
md += `| UI Label | Collection | Firestore Field |\n`;
md += `|---|---|---|\n`;

// Auto-generate mapping rows for all fields across all collections
for (const [colName, { schema }] of Object.entries(found)) {
  for (const field of Object.keys(schema)) {
    // Convert camelCase to readable label
    const label = field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .replace(/_/g, ' ');
    md += `| ${label} | \`${colName}\` | \`${field}\` |\n`;
  }
}

md += `\n---\n\n`;
md += `## Collections Not Yet Created\n\n`;
md += `Add entries here as the system grows.\n\n`;
md += `| Collection | Purpose |\n|---|---|\n`;
const allFound = new Set(Object.keys(found));
const suggested = [
  ['cycles',      'Evaluation cycles (semester, start/end dates, status)'],
  ['evaluations', 'Submitted evaluation forms per faculty per cycle'],
  ['rankings',    'Computed ranking results per faculty per cycle'],
  ['criteria',    'Scoring rubric / criteria definitions'],
];
for (const [col, desc] of suggested) {
  if (!allFound.has(col)) md += `| \`${col}\` | ${desc} |\n`;
}
md += '\n';

writeFileSync('SCHEMA.md', md, 'utf8');
console.log('\n✅  SCHEMA.md written successfully.\n');
process.exit(0);

/**
 * One-time script to create the HR-Admin account in Firebase Authentication.
 * Run once:  node scripts/createAdmin.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            "AIzaSyB77ryKtsEf0sLYrSn3dcwuud5Ud-VBwtE",
  authDomain:        "gcfares-6bf1e.firebaseapp.com",
  projectId:         "gcfares-6bf1e",
  storageBucket:     "gcfares-6bf1e.firebasestorage.app",
  messagingSenderId: "91039015169",
  appId:             "1:91039015169:web:846d32cc5776c026ed7b00",
};

const ADMIN_EMAIL    = 'admin@gordoncollege.edu.ph';
const ADMIN_PASSWORD = 'admin123';

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

try {
  const { user } = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`✅  Admin account created successfully!`);
  console.log(`    UID   : ${user.uid}`);
  console.log(`    Email : ${user.email}`);
} catch (err) {
  if (err.code === 'auth/email-already-in-use') {
    console.log('ℹ️  Account already exists — nothing to do.');
  } else {
    console.error('❌  Error creating account:', err.message);
  }
} finally {
  process.exit(0);
}

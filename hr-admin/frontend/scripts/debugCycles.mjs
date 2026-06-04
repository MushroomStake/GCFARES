/**
 * Quick debug script to check ranking_cycles collection
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyB77ryKtsEf0sLYrSn3dcwuud5Ud-VBwtE",
  authDomain:        "gcfares-6bf1e.firebaseapp.com",
  projectId:         "gcfares-6bf1e",
  storageBucket:     "gcfares-6bf1e.firebasestorage.app",
  messagingSenderId: "91039015169",
  appId:             "1:91039015169:web:846d32cc5776c026ed7b00",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

try {
  console.log('🔍 Checking ranking_cycles collection...\n');

  // Get all cycles
  const allCycles = await getDocs(collection(db, 'ranking_cycles'));
  console.log(`Found ${allCycles.size} total cycles:`);
  
  allCycles.forEach(doc => {
    const data = doc.data();
    console.log(`\nDocument ID: ${doc.id}`);
    console.log(`  title: ${data.title}`);
    console.log(`  status: ${data.status}`);
    console.log(`  year: ${data.year}`);
    console.log(`  semester: ${data.semester}`);
    
    if (data.created_at) {
      const createdDate = data.created_at.toDate ? data.created_at.toDate() : new Date(data.created_at);
      console.log(`  created_at: ${createdDate.toISOString()}`);
    }
    
    if (data.start_date) {
      const startDate = data.start_date.toDate ? data.start_date.toDate() : new Date(data.start_date);
      console.log(`  start_date: ${startDate.toISOString()}`);
    }
    
    if (data.deadline) {
      const deadline = data.deadline.toDate ? data.deadline.toDate() : new Date(data.deadline);
      console.log(`  deadline: ${deadline.toISOString()}`);
    }
  });

  // Try the exact same query as dashboard
  console.log('\n🎯 Testing dashboard query (status == "open"):');
  const openCycles = await getDocs(query(collection(db, 'ranking_cycles'), where('status', '==', 'open')));
  console.log(`Found ${openCycles.size} open cycles`);
  
  if (openCycles.size > 0) {
    openCycles.forEach(doc => {
      console.log(`  → ${doc.id}: ${doc.data().title} (status: ${doc.data().status})`);
    });
  } else {
    console.log('  → No cycles with status="open" found');
  }

} catch (error) {
  console.error('❌ Error:', error);
} finally {
  process.exit(0);
}

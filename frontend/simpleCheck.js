// Simple test to check Firestore connection and data
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAbswJhJnHDBqoJRIu0AA3vzfsOApf13VA",
  authDomain: "sia-hr-admin.firebaseapp.com",
  projectId: "sia-hr-admin",
  storageBucket: "sia-hr-admin.firebasestorage.app",
  messagingSenderId: "92318918811",
  appId: "1:92318918811:web:20062227bb930c8b2990ba"
};

console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDatabase() {
  try {
    console.log('🔄 Connecting to ranking_cycles collection...');
    const snapshot = await getDocs(collection(db, 'ranking_cycles'));
    
    console.log(`📊 Found ${snapshot.size} documents in ranking_cycles`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Document ID: ${doc.id}`);
      console.log(`  title: ${data.title}`);
      console.log(`  cycle_name: ${data.cycle_name}`);
      console.log(`  status: ${data.status}`);
      console.log(`  year: ${data.year}`);
      console.log('  All fields:', Object.keys(data));
      console.log('---');
    });
    
    // Look specifically for open cycles
    const openCycles = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'open') {
        openCycles.push({ id: doc.id, ...data });
      }
    });
    
    console.log(`\n🔍 Found ${openCycles.length} open cycles:`);
    openCycles.forEach(cycle => {
      console.log(`  - ${cycle.cycle_name} (ID: ${cycle.id})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDatabase().then(() => {
  console.log('✅ Check complete');
}).catch(err => {
  console.error('❌ Check failed:', err);
});

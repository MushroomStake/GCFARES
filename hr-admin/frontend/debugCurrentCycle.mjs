import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAbswJhJnHDBqoJRIu0AA3vzfsOApf13VA",
  authDomain: "sia-hr-admin.firebaseapp.com",
  projectId: "sia-hr-admin",
  storageBucket: "sia-hr-admin.firebasestorage.app",
  messagingSenderId: "92318918811",
  appId: "1:92318918811:web:20062227bb930c8b2990ba"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugCurrentCycle() {
  console.log('🔄 Debugging current cycle issue...');
  
  try {
    // Get all cycles
    const allCyclesQuery = query(collection(db, 'ranking_cycles'));
    const allCyclesSnap = await getDocs(allCyclesQuery);
    
    console.log(`📊 Found ${allCyclesSnap.size} total cycles`);
    
    const allCycles = allCyclesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('All cycles:', JSON.stringify(allCycles, null, 2));
    
    // Look specifically for open cycles
    const openCycles = allCycles.filter(cycle => cycle.status === 'open');
    console.log(`🔍 Open cycles found: ${openCycles.length}`);
    
    if (openCycles.length > 0) {
      console.log('Open cycle details:', JSON.stringify(openCycles[0], null, 2));
    } else {
      console.log('❌ No cycles with status="open" found');
      
      // Check what statuses exist
      const statuses = allCycles.map(c => c.status);
      console.log('Existing statuses:', [...new Set(statuses)]);
    }
    
    // Try the query approach that's used in the dashboard
    console.log('\n🔍 Testing dashboard query approach...');
    const cyclesQuery = query(collection(db, 'ranking_cycles'));
    const cyclesSnap = await getDocs(cyclesQuery);
    const cycles = cyclesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const foundOpenCycle = cycles.find(c => c.status === 'open');
    
    if (foundOpenCycle) {
      console.log('✅ Dashboard query would find cycle:', foundOpenCycle.cycle_name);
    } else {
      console.log('❌ Dashboard query would NOT find any open cycle');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCurrentCycle().then(() => {
  console.log('✅ Debug complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Debug failed:', err);
  process.exit(1);
});

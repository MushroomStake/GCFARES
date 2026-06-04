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

async function debugCycleData() {
  console.log('🔍 Debugging cycle data and naming conventions...');
  
  try {
    // Get all cycles
    const cyclesSnapshot = await getDocs(collection(db, 'ranking_cycles'));
    console.log(`📊 Found ${cyclesSnapshot.size} cycles total`);
    
    cyclesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n📋 Document ID: ${doc.id}`);
      console.log('   All fields and values:');
      Object.entries(data).forEach(([key, value]) => {
        if (key.includes('date') || key.includes('deadline')) {
          // Handle timestamps
          const dateValue = value?.toDate ? value.toDate().toISOString() : value;
          console.log(`   ${key}: ${dateValue}`);
        } else {
          console.log(`   ${key}: ${value}`);
        }
      });
      
      // Check current status
      if (data.status === 'open') {
        console.log('   🟢 This cycle has status="open"');
        
        // Check dates
        const now = new Date();
        const start = data.start_date?.toDate ? data.start_date.toDate() : new Date(data.start_date);
        console.log(`   📅 Current time: ${now.toISOString()}`);
        console.log(`   📅 Start time: ${start.toISOString()}`);
        console.log(`   ⏰ Is current time < start time? ${now < start}`);
        
        if (now < start) {
          console.log('   ❌ This explains "Not Started" - current time is before start time');
        } else {
          console.log('   ✅ Current time is after start time - should show "In Progress"');
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCycleData().then(() => {
  console.log('\n✅ Debug complete');
}).catch(err => {
  console.error('❌ Debug failed:', err);
});

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

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

async function fixMissingTimestamps() {
  console.log('🔄 Checking for cycles with missing created_at timestamps...');
  
  try {
    const cyclesSnapshot = await getDocs(collection(db, 'ranking_cycles'));
    let fixedCount = 0;
    
    for (const docSnapshot of cyclesSnapshot.docs) {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      
      console.log(`📋 Checking cycle: ${docId}`);
      console.log(`   title: ${data.title}`);
      console.log(`   created_at: ${data.created_at || 'MISSING'}`);
      
      // Check if created_at is missing or undefined
      if (!data.created_at) {
        console.log(`🔧 Fixing missing created_at for cycle: ${docId}`);
        
        // Set created_at to now (or you could use a specific date if you know when it was created)
        const fixedData = {
          created_at: Timestamp.now()
        };
        
        await updateDoc(doc(db, 'ranking_cycles', docId), fixedData);
        console.log(`✅ Fixed created_at for cycle: ${docId}`);
        fixedCount++;
      } else {
        console.log(`✓ Cycle ${docId} already has created_at`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total cycles: ${cyclesSnapshot.size}`);
    console.log(`   Fixed cycles: ${fixedCount}`);
    console.log(`   ✅ All cycles now have created_at timestamps`);
    
  } catch (error) {
    console.error('❌ Error fixing timestamps:', error);
  }
}

fixMissingTimestamps().then(() => {
  console.log('🏁 Timestamp fix complete');
}).catch(err => {
  console.error('❌ Fix failed:', err);
});

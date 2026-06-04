import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAbswJhJnHDBqoJRIu0AA3vzfsOApf13VA",
  authDomain: "sia-hr-admin.firebaseapp.com",
  projectId: "sia-hr-admin",
  storageBucket: "sia-hr-admin.firebasestorage.app",
  messagingSenderId: "92318918811",
  appId: "1:92318918811:web:20062227bb930c8b2990ba"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function ensureAdminAccount() {
  const adminEmail = 'admin@gordoncollege.edu.ph';
  const adminPassword = 'admin123';
  
  try {
    console.log('🔄 Checking if admin account exists...');
    
    // Try to sign in first (to check if account exists)
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log('✅ Admin account already exists and password is correct');
    } catch (signInError) {
      if (signInError.code === 'auth/user-not-found') {
        console.log('🔄 Admin account not found. Creating it...');
        
        // Create the admin account
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log('✅ Admin account created successfully:', userCredential.user.email);
      } else if (signInError.code === 'auth/wrong-password') {
        console.log('❌ Admin account exists but password is incorrect');
        console.log('Please reset the password in Firebase Console or use the correct password');
      } else {
        console.error('❌ Error checking admin account:', signInError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error with admin account setup:', error.message);
  }
}

ensureAdminAccount().then(() => {
  console.log('✅ Admin account check complete');
}).catch(err => {
  console.error('❌ Admin account check failed:', err);
});

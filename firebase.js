// firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDxat03Wt49Kr13MRpOw4jj2eqUAdDYA2M",
    authDomain: "inventory-management-aee6b.firebaseapp.com",
    projectId: "inventory-management-aee6b",
    storageBucket: "inventory-management-aee6b.appspot.com",
    messagingSenderId: "580069269845",
    appId: "1:580069269845:web:ea9467b8dddfb19b24cfdc",
    measurementId: "G-8FGXQ8W20D"
  };

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

export { firestore, auth };
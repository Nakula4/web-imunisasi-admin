import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDp0uoEdd8M82cbaveehd9T3YDpB1ZFPO0",
  authDomain: "imunisasiku-1abc0.firebaseapp.com",
  projectId: "imunisasiku-1abc0",
  storageBucket: "imunisasiku-1abc0.firebasestorage.app",
  messagingSenderId: "466468445341",
  appId: "1:466468445341:web:6c2c6d4c8571c7a53f4874",
  measurementId: "G-MB5TTXB9WY"
};
  
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  
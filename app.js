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

// Inisialisasi Firestore
const firebase = require('firebase/app');
const auth = require('firebase/auth');
const firestore = require('firebase/firestore');

// Form login handler
const loginForm = document.getElementById('login-form');
const errorElement = document.getElementById('error-message');
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // User berhasil login
      console.log('User berhasil login');
    })
    .catch((error) => {
      // Error login
      console.error('Error login:', error);
      if (error.code === 'auth/wrong-password') {
        errorElement.textContent = 'Password salah';
      } else if (error.code === 'auth/user-not-found') {
        errorElement.textContent = 'Username tidak ditemukan';
      } else {
        errorElement.textContent = 'Error login: ' + error.message;
      }
    });
});
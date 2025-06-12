// Konfigurasi Firebase
  const firebaseConfig = {
  apiKey: "AIzaSyDp0uoEdd8M82cbaveehd9T3YDpB1ZFPO0",
  authDomain: "imunisasiku-1abc0.firebaseapp.com",
  projectId: "imunisasiku-1abc0",
  storageBucket: "imunisasiku-1abc0.firebasestorage.app",
  messagingSenderId: "466468445341",
  appId: "1:466468445341:web:6c2c6d4c8571c7a53f4874",
  measurementId: "G-MB5TTXB9WY"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Set persistence untuk menghindari error visibility-check
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
    console.error("Set persistence error:", error);
  });

// Event listener untuk form pendaftaran
const form = document.getElementById('registerForm');
form.addEventListener('submit', function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const nama = document.getElementById('nama').value;
  const username = document.getElementById('username').value;
  const no_hp = document.getElementById('no_hp').value;

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return db.collection('admins').doc(user.uid).set({
        email,
        nama,
        username,
        no_hp,
        role: 'admin'
      });
    })
    .then(() => {
      alert('Akun admin berhasil didaftarkan!');
      window.location.href = 'index.html';
    })
    .catch((error) => {
      alert('Error: ' + error.message);
    });
});

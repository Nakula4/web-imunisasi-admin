import { showPopup, togglePassword } from './popupUtils.js';

// Firebase initialization
let auth;

const waitForFirebase = () => {
  console.log('Menunggu inisialisasi Firebase...');
  return new Promise((resolve) => {
    const checkFirebase = () => {
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        auth = firebase.auth();
        console.log('Firebase berhasil diinisialisasi untuk login');
        resolve();
      } else {
        console.log('Firebase belum siap, menunggu...');
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  });
};

const showLoginMessage = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('redirected') === 'true') {
    showPopup(
      'Diperlukan Login',
      'Silakan login terlebih dahulu untuk mengakses dashboard!',
      'warning'
    );
    console.log('Menampilkan pesan login karena redirect dari dashboard');
  }
};

const setupLoginForm = async () => {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) {
    console.warn('Elemen loginForm tidak ditemukan');
    return;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Formulir login disubmit');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const validations = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      password: !!password,
    };

    Object.entries(validations).forEach(([key, valid]) => {
      const element = document.getElementById(key);
      element.classList[valid ? 'remove' : 'add']('is-invalid');
    });

    if (!Object.values(validations).every(Boolean)) {
      showPopup('Kesalahan Validasi', 'Harap isi email dan password dengan benar!', 'warning');
      return;
    }

    try {
      await auth.signInWithEmailAndPassword(email, password);
      console.log('Login berhasil, mengarahkan ke dashboard-admin.html');
      window.location.href = 'dashboard-admin.html';
    } catch (error) {
      console.error('Kesalahan login:', error);
      const errorMessages = {
        'auth/invalid-email': 'Format email tidak valid!',
        'auth/user-not-found': 'Pengguna tidak ditemukan!',
        'auth/wrong-password': 'Password salah!',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.',
      };
      showPopup(
        'Login Gagal',
        errorMessages[error.code] || `Gagal login: ${error.message}`,
        'danger'
      );
    }
  });
};

const initializeLogin = async () => {
  console.log('Menginisialisasi login...');
  try {
    await waitForFirebase();
    showLoginMessage();
    setupLoginForm();

    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('Pengguna sudah login:', user.email);
        window.location.href = 'dashboard-admin.html';
      }
    });
  } catch (error) {
    console.error('Kesalahan inisialisasi login:', error);
    showPopup('Kesalahan Inisialisasi', `Gagal menginisialisasi login: ${error.message}`, 'danger');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM selesai dimuat, menjalankan initializeLogin');
    initializeLogin();
  });
} else {
  console.log('DOM sudah siap, menjalankan initializeLogin');
  initializeLogin();
}

export { togglePassword };
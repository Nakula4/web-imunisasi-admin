import { showPopup } from './popupUtils.js';

// Firebase initialization
let auth;

const waitForFirebase = () => {
  console.log('Menunggu inisialisasi Firebase untuk dashboard...');
  return new Promise((resolve) => {
    const checkFirebase = () => {
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        auth = firebase.auth();
        console.log('Firebase berhasil diinisialisasi untuk dashboard');
        resolve();
      } else {
        console.log('Firebase belum siap, menunggu...');
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  });
};

const checkAuth = async () => {
  console.log('Memeriksa status autentikasi...');
  try {
    await waitForFirebase();
    auth.onAuthStateChanged((user) => {
      if (!user) {
        console.log('Pengguna belum login, mengarahkan ke index.html');
        showPopup(
          'Diperlukan Login',
          'Silakan login terlebih dahulu untuk mengakses dashboard!',
          'warning',
          {
            okCallback: () => {
              window.location.href = 'index.html?redirected=true';
            },
          }
        );
      } else {
        console.log('Pengguna sudah login:', user.email);
        // Lanjutkan inisialisasi dashboard
      }
    });
  } catch (error) {
    console.error('Kesalahan memeriksa autentikasi:', error);
    showPopup('Kesalahan', `Gagal memeriksa autentikasi: ${error.message}`, 'danger');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM selesai dimuat, menjalankan checkAuth');
    checkAuth();
  });
} else {
  console.log('DOM sudah siap, menjalankan checkAuth');
  checkAuth();
}
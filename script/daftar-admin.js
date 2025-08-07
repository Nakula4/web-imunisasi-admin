import { showPopup } from './popupUtils.js';

// Firebase initialization
let auth;
let db;

const waitForFirebase = () => {
  console.log('Menunggu inisialisasi Firebase...');
  return new Promise((resolve) => {
    const checkFirebase = () => {
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        auth = firebase.auth();
        db = firebase.firestore();
        console.log('Firebase berhasil diinisialisasi untuk pendaftaran');
        resolve();
      } else {
        console.log('Firebase belum siap, menunggu...');
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  });
};

const setPersistence = async () => {
  try {
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    console.log("Persistence set successfully");
  } catch (error) {
    console.error("Set persistence error:", error);
    showPopup('Error', 'Gagal mengatur persistence: ' + error.message, 'danger');
  }
};

// Validasi input
const validateInput = (username, email, password, nama, no_hp) => {
  const errors = [];
  
  // Validasi username
  if (!username || username.trim().length < 3) {
    errors.push('Username minimal 3 karakter');
  }
  
  // Validasi email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Format email tidak valid');
  }
  
  // Validasi password
  if (!password || password.length < 6) {
    errors.push('Password minimal 6 karakter');
  }
  
  // Validasi nama
  if (!nama || nama.trim().length < 2) {
    errors.push('Nama minimal 2 karakter');
  }
  
  // Validasi no_hp
  const phoneRegex = /^[0-9+\-\s()]+$/;
  if (!no_hp || !phoneRegex.test(no_hp) || no_hp.length < 8) {
    errors.push('Format nomor HP tidak valid');
  }
  
  return errors;
};

// Sanitasi input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/<[^>]*>/g, '');
};

// Cek username uniqueness
const checkUsernameUniqueness = async (username) => {
  try {
    const snapshot = await db.collection('admins')
      .where('username', '==', username)
      .limit(1)
      .get();
    
    return snapshot.empty;
  } catch (error) {
    console.error('Error checking username uniqueness:', error);
    throw new Error('Gagal memeriksa ketersediaan username');
  }
};

// Tampilkan error
const showError = (message) => {
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  
  if (errorMessage && errorText) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  } else {
    showPopup('Error', message, 'danger');
  }
};

// Sembunyikan error
const hideError = () => {
  const errorMessage = document.getElementById('errorMessage');
  if (errorMessage) {
    errorMessage.style.display = 'none';
  }
};

// Update loading state
const updateLoadingState = (isLoading) => {
  const registerBtn = document.getElementById('registerBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const registerText = document.getElementById('registerText');
  
  if (registerBtn && loadingSpinner && registerText) {
    if (isLoading) {
      loadingSpinner.classList.add('active');
      registerText.textContent = 'Memproses...';
      registerBtn.disabled = true;
    } else {
      loadingSpinner.classList.remove('active');
      registerText.textContent = 'Daftar Sekarang';
      registerBtn.disabled = false;
    }
  }
};

// Event listener untuk form pendaftaran
const setupRegisterForm = async () => {
  const form = document.getElementById('registerForm');
  
  // Null check
  if (!form) {
    console.error('Form pendaftaran tidak ditemukan');
    showPopup('Error', 'Form pendaftaran tidak ditemukan', 'danger');
    return;
  }
  
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    // Sembunyikan error sebelumnya
    hideError();
    
    // Null checks untuk input elements
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const namaInput = document.getElementById('nama');
    const usernameInput = document.getElementById('username');
    const no_hpInput = document.getElementById('no_hp');
    
    if (!emailInput || !passwordInput || !namaInput || !usernameInput || !no_hpInput) {
      showError('Beberapa elemen form tidak ditemukan');
      return;
    }
    
    // Ambil nilai input
    const email = sanitizeInput(emailInput.value);
    const password = passwordInput.value; // Jangan sanitize password
    const nama = sanitizeInput(namaInput.value);
    const username = sanitizeInput(usernameInput.value);
    const no_hp = sanitizeInput(no_hpInput.value);
    
    // Validasi input
    const validationErrors = validateInput(username, email, password, nama, no_hp);
    if (validationErrors.length > 0) {
      showError(validationErrors.join(', '));
      return;
    }
    
    // Update loading state
    updateLoadingState(true);
    
    try {
      // Cek username uniqueness
      const isUsernameUnique = await checkUsernameUniqueness(username);
      if (!isUsernameUnique) {
        throw new Error('Username sudah digunakan, silakan pilih username lain');
      }
      
      // Buat user dengan Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Simpan data admin ke Firestore
      await db.collection('admins').doc(user.uid).set({
        email,
        nama,
        username,
        no_hp,
        role: 'admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Berhasil mendaftar
      console.log('Akun admin berhasil didaftarkan!');
      showPopup(
        'Berhasil',
        'Akun admin berhasil didaftarkan! Silakan login dengan akun baru Anda.',
        'success'
      );
      
      // Redirect ke halaman login setelah 2 detik
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
      
    } catch (error) {
      console.error('Kesalahan pendaftaran:', error);
      const errorMessages = {
        'auth/email-already-in-use': 'Email sudah digunakan!',
        'auth/invalid-email': 'Format email tidak valid!',
        'auth/weak-password': 'Password terlalu lemah! Minimal 6 karakter.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.'
      };
      
      showError(errorMessages[error.code] || `Gagal mendaftar: ${error.message}`);
    } finally {
      // Reset loading state
      updateLoadingState(false);
    }
  });
};

const initializeRegister = async () => {
  console.log('Menginisialisasi pendaftaran...');
  try {
    await waitForFirebase();
    await setPersistence();
    setupRegisterForm();
  } catch (error) {
    console.error('Kesalahan inisialisasi pendaftaran:', error);
    showPopup('Kesalahan Inisialisasi', `Gagal menginisialisasi pendaftaran: ${error.message}`, 'danger');
  }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM selesai dimuat, menjalankan initializeRegister');
    initializeRegister();
  });
} else {
  console.log('DOM sudah siap, menjalankan initializeRegister');
  initializeRegister();
}

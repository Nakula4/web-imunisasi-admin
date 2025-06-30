import { showPopup, togglePassword } from './popupUtils.js';

// Firebase initialization
let db, auth;
const VERIFICATION_URL = 'http://localhost:8080/pengaturan.html';

// Utility functions
const waitForFirebase = () => {
  console.log('Menunggu inisialisasi Firebase...');
  return new Promise((resolve) => {
    const checkFirebase = () => {
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        db = firebase.firestore();
        auth = firebase.auth();
        console.log('Firebase berhasil diinisialisasi');
        resolve();
      } else {
        console.log('Firebase belum siap, menunggu...');
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  });
};

const showLoading = (show) => {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
    console.log(`Loading overlay: ${show ? 'ditampilkan' : 'disembunyikan'}`);
  } else {
    console.warn('Elemen loadingOverlay tidak ditemukan');
  }
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhoneNumber = (phone) => (phone ? /^(\+62|0)[1-9][0-9]{8,12}$/.test(phone) : true);

// Debug utilities
const updateDebugInfo = () => {
  const debugInfo = document.getElementById('debugInfo');
  if (!debugInfo) {
    console.warn('Elemen debugInfo tidak ditemukan');
    return;
  }

  const user = auth?.currentUser;
  debugInfo.innerHTML = `
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>User Status:</strong> ${user ? 'Authenticated' : 'Not Authenticated'}</p>
    <p><strong>Last Sign-In:</strong> ${user?.metadata.lastSignInTime || '-'}</p>
  `;
  console.log('Debug info diperbarui:', {
    userStatus: user ? 'Authenticated' : 'Not Authenticated',
    lastSignIn: user?.metadata.lastSignInTime,
  });
};

window.globalFunctions = window.globalFunctions || {};
window.globalFunctions.toggleDebug = () => {
  const debugCard = document.getElementById('debugCard');
  const toggleBtn = document.querySelector('button[onclick="globalFunctions.toggleDebug()"]');
  if (debugCard && toggleBtn) {
    debugCard.style.display = debugCard.style.display === 'none' ? 'block' : 'none';
    toggleBtn.innerHTML =
      debugCard.style.display === 'none'
        ? '<i class="fas fa-bug me-1"></i>Show Debug Info'
        : '<i class="fas fa-bug me-1"></i>Hide Debug Info';
    console.log(`Debug card: ${debugCard.style.display === 'none' ? 'disembunyikan' : 'ditampilkan'}`);
  } else {
    console.warn('Elemen debugCard atau toggleBtn tidak ditemukan');
  }
};

// Email verification
const addVerifyEmailButton = (emailVerified) => {
  const profileForm = document.getElementById('profileForm');
  const submitBtn = document.getElementById('profileSubmitBtn');
  if (!profileForm || !submitBtn) {
    console.warn('Elemen profileForm atau profileSubmitBtn tidak ditemukan');
    return;
  }

  const existingVerifyBtn = profileForm.querySelector('#verifyEmailBtn');
  if (existingVerifyBtn) existingVerifyBtn.remove();

  if (!emailVerified) {
    const verifyButton = document.createElement('button');
    verifyButton.type = 'button';
    verifyButton.id = 'verifyEmailBtn';
    verifyButton.className = 'btn btn-warning btn-sm ms-2';
    verifyButton.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Verifikasi Email';
    submitBtn.insertAdjacentElement('afterend', verifyButton);
    verifyButton.addEventListener('click', handleVerifyEmail);
    console.log('Tombol verifikasi email ditambahkan di samping Simpan Perubahan');
  } else {
    console.log('Email sudah diverifikasi, tombol verifikasi tidak ditambahkan');
  }
};

const handleVerifyEmail = async () => {
  showLoading(true);
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Tidak ada pengguna yang terautentikasi');

    console.log('Mengirim email verifikasi ke:', user.email);
    await user.sendEmailVerification({ url: VERIFICATION_URL, handleCodeInApp: true });
    showPopup(
      'Email Verifikasi Dikirim',
      `📧 Email verifikasi telah dikirim ke: <strong>${user.email}</strong><br><br>
      🔍 Silakan buka email Anda dan klik link verifikasi<br>
      🔄 Setelah verifikasi, refresh halaman ini`,
      'info'
    );
  } catch (error) {
    console.error('Gagal mengirim email verifikasi:', error);
    const errorMessages = {
      'auth/unauthorized-continue-uri': 'Domain tidak diizinkan. Silakan hubungi administrator.',
      'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.',
    };
    showPopup(
      'Verifikasi Email Gagal',
      `Verifikasi email gagal: ${errorMessages[error.code] || error.message}`,
      'danger'
    );
  } finally {
    showLoading(false);
  }
};

const checkSessionValidity = async (user) => {
  try {
    const idToken = await user.getIdToken(true);
    console.log('Sesi valid, ID token diperbarui');
    return { success: true, idToken };
  } catch (error) {
    console.error('Sesi tidak valid:', error);
    return { success: false, error };
  }
};

const updateEmailComplete = async (newEmail) => {
  console.log('Memulai pembaruan email ke:', newEmail);
  const user = auth.currentUser;
  if (!user) throw new Error('Pengguna tidak terautentikasi');

  const sessionCheck = await checkSessionValidity(user);
  if (!sessionCheck.success) {
    await auth.signOut();
    throw new Error('Sesi tidak valid. Silakan login kembali.');
  }

  await user.reload();
  if (!user.emailVerified) {
    console.log('Email saat ini belum diverifikasi:', user.email);
    return { success: false, reason: 'EMAIL_NOT_VERIFIED', email: user.email };
  }

  try {
    await user.updateEmail(newEmail);
    await user.sendEmailVerification({ url: VERIFICATION_URL, handleCodeInApp: true });
    console.log('Email berhasil diperbarui dan verifikasi dikirim');
    return { success: true, newEmail };
  } catch (error) {
    console.error('Gagal memperbarui email:', error);
    if (error.code === 'auth/operation-not-allowed') {
      await auth.signOut();
      throw new Error('Operasi diblokir oleh server. Silakan login kembali.');
    }
    throw error;
  }
};

// Profile management
const loadProfileData = async () => {
  console.log('Memuat data profil...');
  showLoading(true);
  try {
    await waitForFirebase();
    const user = auth.currentUser;
    if (!user) {
      showPopup('Diperlukan Login', 'Silakan login terlebih dahulu untuk mengakses pengaturan!', 'warning', {
        okCallback: () => (window.location.href = 'index.html?redirected=true'),
      });
      return;
    }

    await user.reload();
    const sessionCheck = await checkSessionValidity(user);
    if (!sessionCheck.success) {
      showPopup('Sesi Tidak Valid', 'Sesi Anda tidak valid. Silakan login kembali.', 'danger', {
        okCallback: () => auth.signOut().then(() => (window.location.href = 'index.html?redirected=true')),
      });
      return;
    }

    addVerifyEmailButton(user.emailVerified);
    const adminDoc = await db.collection('admins').doc(user.uid).get();

    if (adminDoc.exists) {
      const data = adminDoc.data();
      console.log('Dokumen admin ditemukan:', data);
      const fields = {
        adminNama: data.nama || '',
        adminEmail: data.email || user.email,
        adminNoHp: data.no_hp || '',
        adminUsername: data.username || '',
      };
      Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
        else console.warn(`Elemen ${id} tidak ditemukan`);
      });

      if (data.preferences) {
        const preferenceFields = {
          language: data.preferences.language || 'id',
          timezone: data.preferences.timezone || 'Asia/Jakarta',
          dateFormat: data.preferences.dateFormat || 'dd/mm/yyyy',
          recordsPerPage: data.preferences.recordsPerPage || '25',
          emailNotifications: data.preferences.notifications?.email || false,
          systemNotifications: data.preferences.notifications?.system || false,
          reportNotifications: data.preferences.notifications?.report || false,
        };
        Object.entries(preferenceFields).forEach(([id, value]) => {
          const element = document.getElementById(id);
          if (element) element[element.type === 'checkbox' ? 'checked' : 'value'] = value;
          else console.warn(`Elemen preferensi ${id} tidak ditemukan`);
        });
      }

      const backupFields = {
        autoBackup: data.autoBackup || false,
        manualBackupBtn: data.lastBackup
          ? `Backup terakhir: ${new Date(data.lastBackup.toDate()).toLocaleString('id-ID')}`
          : 'Lakukan Backup Sekarang',
        exportExcelBtn: !data.lastBackup,
        exportCsvBtn: !data.lastBackup,
      };
      Object.entries(backupFields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
          if (id === 'autoBackup') element.checked = value;
          else if (id === 'manualBackupBtn') element.textContent = value;
          else element.disabled = value;
        } else {
          console.warn(`Elemen backup ${id} tidak ditemukan`);
        }
      });

      document.getElementById('profileLoading')?.style.setProperty('display', 'none');
      document.getElementById('profileContent')?.style.setProperty('display', 'block');
      console.log('Data profil berhasil dimuat');
    } else {
      console.log('Dokumen admin tidak ditemukan, membuat default...');
      await createDefaultAdminDoc(user);
    }
  } catch (error) {
    console.error('Kesalahan memuat profil:', error);
    showPopup('Kesalahan Memuat', `Gagal memuat data profil: ${error.message}`, 'danger');
  } finally {
    showLoading(false);
    updateDebugInfo();
  }
};

const createDefaultAdminDoc = async (user) => {
  try {
    const defaultData = {
      nama: '',
      email: user.email,
      no_hp: '',
      username: '',
      preferences: {
        language: 'id',
        timezone: 'Asia/Jakarta',
        dateFormat: 'dd/mm/yyyy',
        recordsPerPage: 25,
        notifications: { email: true, system: true, report: false },
      },
      autoBackup: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('admins').doc(user.uid).set(defaultData);
    console.log('Dokumen admin default dibuat');
    showPopup('Setup Selesai', 'Dokumen admin default telah dibuat.', 'info');
    setTimeout(loadProfileData, 1000);
  } catch (error) {
    console.error('Kesalahan membuat dokumen admin:', error);
    showPopup('Kesalahan Setup', `Gagal membuat dokumen admin: ${error.message}`, 'danger');
  }
};

const setupProfileForm = () => {
  const profileForm = document.getElementById('profileForm');
  if (!profileForm) {
    console.warn('Elemen profileForm tidak ditemukan');
    return;
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Formulir profil disubmit');
    const fields = {
      nama: document.getElementById('adminNama'),
      email: document.getElementById('adminEmail'),
      noHp: document.getElementById('adminNoHp'),
      username: document.getElementById('adminUsername'),
    };

    const values = Object.fromEntries(
      Object.entries(fields).map(([key, el]) => [key, el.value.trim()])
    );

    const validations = {
      nama: !!values.nama,
      email: isValidEmail(values.email),
      noHp: isValidPhoneNumber(values.noHp),
      username: !!values.username,
    };

    Object.entries(validations).forEach(([key, valid]) =>
      fields[key].classList[valid ? 'remove' : 'add']('is-invalid')
    );

    if (!Object.values(validations).every(Boolean)) {
      showPopup('Kesalahan Validasi', 'Harap isi semua field dengan benar!', 'warning');
      return;
    }

    showLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Pengguna tidak terautentikasi');

      if (values.email !== user.email) {
        console.log('Perubahan email terdeteksi:', values.email);
        const result = await updateEmailComplete(values.email);
        if (result.success) {
          await db.collection('admins').doc(user.uid).set(
            { ...values, emailUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
            { merge: true }
          );
          addVerifyEmailButton(false);
          showPopup(
            'Email Verifikasi Email Baru Terkirim',
            `🎉 Email berhasil diubah ke: <strong>${values.email}</strong><br><br>
            📧 Email verifikasi telah dikirim ke email baru<br>
            🔑 Anda sudah bisa login dengan email baru setelah verifikasi`,
            'success'
          );
          setTimeout(() => window.location.reload(), 5000);
        } else if (result.reason === 'EMAIL_NOT_VERIFIED') {
          showPopup(
            'Verifikasi Email Gagal',
            `📧 Email saat ini belum diverifikasi: <strong>${result.email}</strong><br><br>
            🔍 Silakan verifikasi email saat ini terlebih dahulu`,
            'warning',
            { showButtons: true, verifyCallback: handleVerifyEmail }
          );
        }
      } else {
        await db.collection('admins').doc(user.uid).set(
          { ...values, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
        showPopup('Profil Diperbarui', 'Profil berhasil diperbarui!', 'success');
      }
    } catch (error) {
      console.error('Kesalahan memperbarui profil:', error);
      const errorMessages = {
        'auth/email-already-in-use': 'Email sudah digunakan oleh akun lain!',
        'auth/invalid-email': 'Format email tidak valid!',
        'auth/requires-recent-login': 'Sesi Anda sudah kadaluarsa. Silakan login kembali.',
        'auth/operation-not-allowed': 'Operasi diblokir oleh server. Silakan login kembali.',
        'auth/unauthorized-continue-uri': 'Domain tidak diizinkan. Silakan hubungi administrator.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.',
      };
      showPopup(
        'Verifikasi Email Gagal',
        errorMessages[error.code] || `Gagal memperbarui profil: ${error.message}`,
        'danger',
        error.code === 'auth/operation-not-allowed' || error.code === 'auth/requires-recent-login'
          ? { okCallback: () => auth.signOut().then(() => (window.location.href = 'index.html?redirected=true')) }
          : {}
      );
    } finally {
      showLoading(false);
    }
  });
};

// Security management
const setupSecurityForm = () => {
  const securityForm = document.getElementById('securityForm');
  if (!securityForm) {
    console.warn('Elemen securityForm tidak ditemukan');
    return;
  }

  securityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Formulir keamanan disubmit');
    const fields = {
      currentPassword: document.getElementById('currentPassword'),
      newPassword: document.getElementById('newPassword'),
      confirmPassword: document.getElementById('confirmPassword'),
    };

    const values = Object.fromEntries(
      Object.entries(fields).map(([key, el]) => [key, el.value])
    );

    const validations = {
      currentPassword: !!values.currentPassword,
      newPassword: values.newPassword && values.newPassword.length >= 8,
      confirmPassword: values.newPassword === values.confirmPassword,
    };

    Object.entries(validations).forEach(([key, valid]) =>
      fields[key].classList[valid ? 'remove' : 'add']('is-invalid')
    );

    if (!Object.values(validations).every(Boolean)) {
      showPopup('Kesalahan Validasi', 'Harap isi semua field dengan benar!', 'warning');
      return;
    }

    showLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Pengguna tidak terautentikasi');

      const credential = firebase.auth.EmailAuthProvider.credential(user.email, values.currentPassword);
      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(values.newPassword);
      await db.collection('admins').doc(user.uid).set(
        {
          twoFactorEnabled: document.getElementById('twoFactorAuth').checked,
          passwordLastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      showPopup('Keamanan Diperbarui', 'Kata sandi berhasil diperbarui!', 'success');
      securityForm.reset();
    } catch (error) {
      console.error('Kesalahan memperbarui kata sandi:', error);
      const errorMessages = {
        'auth/wrong-password': 'Kata sandi saat ini salah!',
        'auth/weak-password': 'Kata sandi baru terlalu lemah!',
        'auth/requires-recent-login': 'Sesi Anda sudah kadaluarsa. Silakan login kembali.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.',
      };
      showPopup(
        'Gagal Memperbarui Kata Sandi',
        errorMessages[error.code] || `Gagal memperbarui kata sandi: ${error.message}`,
        'danger'
      );
      if (error.code === 'auth/wrong-password') fields.currentPassword.classList.add('is-invalid');
      if (error.code === 'auth/weak-password') fields.newPassword.classList.add('is-invalid');
    } finally {
      showLoading(false);
    }
  });
};

// Preferences management
const setupPreferencesForm = () => {
  const preferencesForm = document.getElementById('preferencesForm');
  if (!preferencesForm) {
    console.warn('Elemen preferencesForm tidak ditemukan');
    return;
  }

  preferencesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Formulir preferensi disubmit');
    showLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Pengguna tidak terautentikasi');

      const preferences = {
        language: document.getElementById('language').value,
        timezone: document.getElementById('timezone').value,
        dateFormat: document.getElementById('dateFormat').value,
        recordsPerPage: Number.parseInt(document.getElementById('recordsPerPage').value),
        notifications: {
          email: document.getElementById('emailNotifications').checked,
          system: document.getElementById('systemNotifications').checked,
          report: document.getElementById('reportNotifications').checked,
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('admins').doc(user.uid).set({ preferences }, { merge: true });
      showPopup('Preferensi Diperbarui', 'Preferensi sistem berhasil diperbarui!', 'success');
    } catch (error) {
      console.error('Kesalahan memperbarui preferensi:', error);
      showPopup('Kesalahan Pembaruan', `Gagal memperbarui preferensi: ${error.message}`, 'danger');
    } finally {
      showLoading(false);
    }
  });
};

// Backup management
const setupBackupSettings = () => {
  const autoBackup = document.getElementById('autoBackup');
  const manualBackupBtn = document.getElementById('manualBackupBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  if (autoBackup) {
    autoBackup.addEventListener('change', async () => {
      showLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('Pengguna tidak terautentikasi');
        await db.collection('admins').doc(user.uid).set(
          { autoBackup: autoBackup.checked, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
        showPopup(
          'Pengaturan Backup Diperbarui',
          `Backup otomatis ${autoBackup.checked ? 'diaktifkan' : 'dinonaktifkan'}!`,
          'success'
        );
      } catch (error) {
        console.error('Kesalahan memperbarui pengaturan backup:', error);
        showPopup('Kesalahan Pembaruan', `Gagal memperbarui pengaturan backup: ${error.message}`, 'danger');
      } finally {
        showLoading(false);
      }
    });
  } else {
    console.warn('Elemen autoBackup tidak ditemukan');
  }

  if (manualBackupBtn) {
    manualBackupBtn.addEventListener('click', async () => {
      showLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('Pengguna tidak terautentikasi');
        await db.collection('admins').doc(user.uid).set(
          { lastBackup: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
        showPopup('Backup Selesai', 'Backup manual berhasil dilakukan!', 'success');
        document.getElementById('lastBackupInfo').textContent = `Backup terakhir: ${new Date().toLocaleString('id-ID')}`;
      } catch (error) {
        console.error('Kesalahan melakukan backup manual:', error);
        showPopup('Kesalahan Backup', `Gagal melakukan backup manual: ${error.message}`, 'danger');
      } finally {
        showLoading(false);
      }
    });
  } else {
    console.warn('Elemen manualBackupBtn tidak ditemukan');
  }

  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () =>
      showPopup('Fitur Tidak Tersedia', 'Fitur export Excel belum diimplementasikan!', 'info')
    );
  } else {
    console.warn('Elemen exportExcelBtn tidak ditemukan');
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () =>
      showPopup('Fitur Tidak Tersedia', 'Fitur export CSV belum diimplementasikan!', 'info')
    );
  } else {
    console.warn('Elemen exportCsvBtn tidak ditemukan');
  }
};

// Main initialization
const initializePengaturan = async () => {
  console.log('Menginisialisasi pengaturan...');
  try {
    await waitForFirebase();
    console.log('Menyiapkan formulir dan pengaturan...');
    setupProfileForm();
    setupSecurityForm();
    setupPreferencesForm();
    setupBackupSettings();

    auth.onAuthStateChanged((user) => {
      console.log('Status autentikasi berubah:', user ? { uid: user.uid, emailVerified: user.emailVerified } : 'Tidak ada pengguna');
      loadProfileData();
    });
  } catch (error) {
    console.error('Kesalahan inisialisasi:', error);
    showPopup('Kesalahan Inisialisasi', `Gagal menginisialisasi pengaturan: ${error.message}`, 'danger');
  }
};

// Export functions and initialize
window.initializePengaturan = initializePengaturan;
window.togglePassword = togglePassword;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM selesai dimuat, menjalankan initializePengaturan');
    initializePengaturan();
  });
} else {
  console.log('DOM sudah siap, menjalankan initializePengaturan');
  initializePengaturan();
}